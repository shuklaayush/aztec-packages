import { pedersenHash, sha256 } from '@aztec/foundation/crypto';
import { Fr } from '@aztec/foundation/fields';
import { ContractClass } from '@aztec/types/contracts';

import { GeneratorIndex } from '../constants.gen.js';
import { computePrivateFunctionsRoot } from './private_function.js';

/**
 * Returns the id of a contract class computed as its hash.
 *
 * ```
 * version = 1
 * private_function_leaves = private_functions.map(fn => pedersen([fn.function_selector as Field, fn.vk_hash], GENERATOR__FUNCTION_LEAF))
 * private_functions_root = merkleize(private_function_leaves)
 * bytecode_commitment = calculate_commitment(packed_bytecode)
 * contract_class_id = pedersen([version, artifact_hash, private_functions_root, bytecode_commitment], GENERATOR__CLASS_IDENTIFIER)
 * ```
 * @param contractClass - Contract class.
 * @returns The identifier.
 */
export function computeContractClassId(contractClass: ContractClass): Fr {
  const { privateFunctionsRoot, publicBytecodeCommitment } = computeContractClassIdPreimage(contractClass);
  return Fr.fromBuffer(
    pedersenHash(
      [contractClass.artifactHash.toBuffer(), privateFunctionsRoot.toBuffer(), publicBytecodeCommitment.toBuffer()],
      GeneratorIndex.CONTRACT_LEAF, // TODO(@spalladino): Review all generator indices in this file
    ),
  );
}

/** Returns the preimage of a contract class id given a contract class. */
export function computeContractClassIdPreimage(contractClass: ContractClass): ContractClassIdPreimage {
  const privateFunctionsRoot = computePrivateFunctionsRoot(contractClass.privateFunctions);
  const publicBytecodeCommitment = computeBytecodeCommitment(contractClass.packedBytecode);
  return { artifactHash: contractClass.artifactHash, privateFunctionsRoot, publicBytecodeCommitment };
}

/** Preimage of a contract class id. */
export type ContractClassIdPreimage = {
  artifactHash: Fr;
  privateFunctionsRoot: Fr;
  publicBytecodeCommitment: Fr;
};

// TODO(@spalladino): Replace with actual implementation
function computeBytecodeCommitment(bytecode: Buffer) {
  return Fr.fromBufferReduce(sha256(bytecode));
}
