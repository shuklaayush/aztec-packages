import { L2Block } from '@aztec/circuit-types';
import { GlobalVariables, Proof } from '@aztec/circuits.js';
import { Fr } from '@aztec/foundation/fields';

import { ProcessedTx } from '../sequencer/processed_tx.js';

/**
 * Assembles an L2Block from a set of processed transactions.
 */
export interface BlockBuilder {
  /**
   * Creates a new L2Block with the given number, containing the set of processed txs.
   * Note that the number of txs need to be a power of two.
   * @param globalVariables - Global variables to include in the block.
   * @param txs - Processed txs to include.
   * @param newModelL1ToL2Messages - L1 to L2 messages emitted by the new inbox.
   * @param newL1ToL2Messages - L1 to L2 messages to be part of the block.
   * @returns The new L2 block along with its proof from the root circuit.
   */
  buildL2Block(
    globalVariables: GlobalVariables,
    txs: ProcessedTx[],
    newModelL1ToL2Messages: Fr[], // TODO(#4492): Rename this when purging the old inbox
    newL1ToL2Messages: Fr[], // TODO(#4492): Nuke this when purging the old inbox
  ): Promise<[L2Block, Proof]>;
}
