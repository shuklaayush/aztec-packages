import { createDebugOnlyLogger } from '@aztec/foundation/log';
import { NoirDependencyConfig, NoirGitDependencyConfig } from '@aztec/foundation/noir';

import { delimiter, join, sep } from 'node:path';
import { unzip } from 'unzipit';

import { FileManager } from '../file-manager/file-manager.js';
import { NoirPackage } from '../package.js';
import { NoirDependency, NoirDependencyResolver } from './dependency-resolver.js';

/**
 * Downloads dependencies from github
 */
export class GithubDependencyResolver implements NoirDependencyResolver {
  #fm: FileManager;
  #log = createDebugOnlyLogger('aztec:compile:github-dependency-resolver');

  constructor(fm: FileManager) {
    this.#fm = fm;
  }

  /**
   * Resolves a dependency from github. Returns null if URL is for a different website.
   * @param _pkg - The package to resolve the dependency for
   * @param dependency - The dependency configuration
   * @returns asd
   */
  async resolveDependency(_pkg: NoirPackage, dependency: NoirDependencyConfig): Promise<NoirDependency | null> {
    // TODO accept ssh urls?
    // TODO github authentication?
    if (!('git' in dependency) || !dependency.git.startsWith('https://github.com')) {
      return null;
    }

    const archivePath = await this.#fetchZipFromGithub(dependency);
    const libPath = await this.#extractZip(dependency, archivePath);
    return {
      version: dependency.tag,
      package: await NoirPackage.open(libPath, this.#fm),
    };
  }

  async #fetchZipFromGithub(dependency: Pick<NoirGitDependencyConfig, 'git' | 'tag'>): Promise<string> {
    if (!dependency.git.startsWith('https://github.com')) {
      throw new Error('Only github dependencies are supported');
    }

    const url = resolveGithubCodeArchive(dependency, 'zip');
    const localArchivePath = join('archives', safeFilename(url.pathname));

    // TODO should check signature before accepting any file
    if (this.#fm.hasFileSync(localArchivePath)) {
      this.#log('using cached archive', { url: url.href, path: localArchivePath });
      return localArchivePath;
    }

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const tmpFile = localArchivePath + '.tmp';
    await this.#fm.writeFile(tmpFile, response.body);
    await this.#fm.moveFile(tmpFile, localArchivePath);

    return localArchivePath;
  }

  async #extractZip(dependency: NoirGitDependencyConfig, archivePath: string): Promise<string> {
    const gitUrl = new URL(dependency.git);
    // extract the archive to this location
    const extractLocation = join('libs', safeFilename(gitUrl.pathname + '@' + (dependency.tag ?? 'HEAD')));

    // where we expect to find this package after extraction
    // it might already exist if the archive got unzipped previously
    const packagePath = join(extractLocation, dependency.directory ?? '');

    if (this.#fm.hasFileSync(packagePath)) {
      this.#log(`Using existing package at ${packagePath}`);
      return packagePath;
    }

    const { entries } = await unzip(await this.#fm.readFile(archivePath));

    // extract to a temporary directory, then move it to the final location
    // TODO empty the temp directory first
    const tmpExtractLocation = extractLocation + '.tmp';
    for (const entry of Object.values(entries)) {
      if (entry.isDirectory) {
        continue;
      }

      // remove the first path segment, because it'll be the archive name
      const name = stripSegments(entry.name, 1);
      const path = join(tmpExtractLocation, name);
      await this.#fm.writeFile(path, (await entry.blob()).stream());
    }

    await this.#fm.moveFile(tmpExtractLocation, extractLocation);

    return packagePath;
  }
}

/**
 * Strips the first n segments from a path
 */
function stripSegments(path: string, count: number): string {
  const segments = path.split(sep).filter(Boolean);
  return segments.slice(count).join(sep);
}

/**
 * Returns a safe filename for a value
 * @param val - The value to convert
 */
export function safeFilename(val: string): string {
  if (!val) {
    throw new Error('invalid value');
  }

  return val.replaceAll(sep, '_').replaceAll(delimiter, '_').replace(/^_+/, '');
}

/**
 * Resolves a dependency's archive URL.
 * @param dependency - The dependency configuration
 * @returns The URL to the library archive
 */
export function resolveGithubCodeArchive(dependency: NoirGitDependencyConfig, format: 'zip' | 'tar'): URL {
  const gitUrl = new URL(dependency.git);
  const [owner, repo] = gitUrl.pathname.slice(1).split('/');
  const ref = dependency.tag ?? 'HEAD';
  const extension = format === 'zip' ? 'zip' : 'tar.gz';

  if (!owner || !repo || gitUrl.hostname !== 'github.com') {
    throw new Error('Invalid Github repository URL');
  }

  return new URL(`https://github.com/${owner}/${repo}/archive/${ref}.${extension}`);
}
