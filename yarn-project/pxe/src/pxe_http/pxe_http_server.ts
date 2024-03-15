import {
  AuthWitness,
  CompleteAddress,
  ContractData,
  ExtendedNote,
  ExtendedUnencryptedL2Log,
  L2Block,
  L2BlockL2Logs,
  LogId,
  Note,
  NullifierMembershipWitness,
  PXE,
  Tx,
  TxEffect,
  TxExecutionRequest,
  TxHash,
  TxReceipt,
} from '@aztec/circuit-types';
import { FunctionSelector } from '@aztec/circuits.js';
import { AztecAddress } from '@aztec/foundation/aztec-address';
import { EthAddress } from '@aztec/foundation/eth-address';
import { Fr, GrumpkinScalar, Point } from '@aztec/foundation/fields';
import { JsonRpcServer, createNamespacedJsonRpcServer } from '@aztec/foundation/json-rpc/server';

import http from 'http';

/**
 * Wraps an instance of Private eXecution Environment (PXE) implementation to a JSON RPC HTTP interface.
 * @returns A new instance of the HTTP server.
 */
export function createPXERpcServer(pxeService: PXE): JsonRpcServer {
  return new JsonRpcServer(
    pxeService,
    {
      CompleteAddress,
      AztecAddress,
      TxExecutionRequest,
      ContractData,
      ExtendedUnencryptedL2Log,
      FunctionSelector,
      TxHash,
      EthAddress,
      Point,
      Fr,
      GrumpkinScalar,
      Note,
      ExtendedNote,
      AuthWitness,
      L2Block,
      TxEffect,
      LogId,
    },
    { Tx, TxReceipt, L2BlockL2Logs, NullifierMembershipWitness },
    ['start', 'stop'],
  );
}

/**
 * Creates an http server that forwards calls to the PXE and starts it on the given port.
 * @param pxeService - PXE that answers queries to the created HTTP server.
 * @param port - Port to listen in.
 * @returns A running http server.
 */
export function startPXEHttpServer(pxeService: PXE, port: string | number): http.Server {
  const pxeServer = createPXERpcServer(pxeService);
  const rpcServer = createNamespacedJsonRpcServer([{ pxe: pxeServer }]);

  const app = rpcServer.getApp();
  const httpServer = http.createServer(app.callback());
  httpServer.listen(port);

  return httpServer;
}
