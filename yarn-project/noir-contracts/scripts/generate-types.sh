#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="./src"
INDEX="$OUT_DIR/index.ts"

rm -rf $OUT_DIR && mkdir -p $OUT_DIR

# Generate index.ts header.
echo "// Auto generated module - do not edit!\n" > $INDEX

for ABI in $(find target -maxdepth 1 -type f ! -name 'debug_*' -name '*.json'); do
  CONTRACT=$(jq -r .name $ABI)
  DEBUG_INFO="$(dirname $ABI)/debug_$(basename $ABI)"

  echo "Creating types for $CONTRACT in $ABI..."
  node --no-warnings ../noir-compiler/dest/cli.js generate-typescript -o $OUT_DIR -d $ABI

  # Add contract import/export to index.ts.
  echo "export * from './${CONTRACT}.js';" >> $INDEX
done

echo "Formatting..."
yarn formatting:fix
