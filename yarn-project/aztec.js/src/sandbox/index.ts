import { Fr, GrumpkinScalar } from '@aztec/foundation/fields';
import { sleep } from '@aztec/foundation/sleep';
import { PXE } from '@aztec/types';

import { getSchnorrAccount } from '../account_manager/index.js';
import { createPXEClient } from '../pxe_client.js';
import { AccountWalletWithPrivateKey } from '../wallet/index.js';

export const INITIAL_SANDBOX_ENCRYPTION_KEYS = [
  GrumpkinScalar.fromString('2153536ff6628eee01cf4024889ff977a18d9fa61d0e414422f7681cf085c281'),
  GrumpkinScalar.fromString('aebd1b4be76efa44f5ee655c20bf9ea60f7ae44b9a7fd1fd9f189c7a0b0cdae'),
  GrumpkinScalar.fromString('0f6addf0da06c33293df974a565b03d1ab096090d907d98055a8b7f4954e120c'),
];

export const INITIAL_SANDBOX_SIGNING_KEYS = INITIAL_SANDBOX_ENCRYPTION_KEYS;

export const INITIAL_SANDBOX_SALTS = [Fr.ZERO, Fr.ZERO, Fr.ZERO];

export const { PXE_URL = 'http://localhost:8080' } = process.env;

/**
 * Gets a collection of wallets for the Aztec accounts that are initially stored in the sandbox.
 * @param pxe - PXE instance.
 * @returns A set of AccountWallet implementations for each of the initial accounts.
 */
export function getSandboxAccountsWallets(pxe: PXE): Promise<AccountWalletWithPrivateKey[]> {
  return Promise.all(
    INITIAL_SANDBOX_ENCRYPTION_KEYS.map((encryptionKey, i) =>
      getSchnorrAccount(pxe, encryptionKey!, INITIAL_SANDBOX_SIGNING_KEYS[i]!, INITIAL_SANDBOX_SALTS[i]).getWallet(),
    ),
  );
}

/**
 * Deploys the initial set of schnorr signature accounts to the sandbox
 * @param pxe - PXE instance.
 * @returns The set of deployed Account objects and associated private encryption keys
 */
export async function deployInitialSandboxAccounts(pxe: PXE) {
  const accounts = INITIAL_SANDBOX_ENCRYPTION_KEYS.map((privateKey, i) => {
    const account = getSchnorrAccount(pxe, privateKey, INITIAL_SANDBOX_SIGNING_KEYS[i], INITIAL_SANDBOX_SALTS[i]);
    return {
      account,
      privateKey,
    };
  });
  // Attempt to get as much parallelism as possible
  const deployMethods = await Promise.all(
    accounts.map(async x => {
      const deployMethod = await x.account.getDeployMethod();
      await deployMethod.create({ contractAddressSalt: x.account.salt });
      await deployMethod.simulate({});
      return deployMethod;
    }),
  );
  // Send tx together to try and get them in the same rollup
  const sentTxs = deployMethods.map(dm => {
    return dm.send();
  });
  await Promise.all(
    sentTxs.map(async (tx, i) => {
      const wallet = await accounts[i].account.getWallet();
      return tx.wait({ wallet });
    }),
  );
  return accounts;
}

/**
 * Function to wait until the sandbox becomes ready for use.
 * @param pxe - The pxe client connected to the sandbox.
 */
export async function waitForSandbox(pxe?: PXE) {
  pxe = pxe ?? createPXEClient(PXE_URL);
  while (true) {
    try {
      await pxe.getNodeInfo();
      break;
    } catch (err) {
      await sleep(1000);
    }
  }
}
