import { Fr } from '@aztec/foundation/fields';

import { AvmMachineState } from '../avm_machine_state.js';
import { IntegralValue } from '../avm_memory_types.js';
import { AvmStateManager } from '../avm_state_manager.js';
import { Instruction, InstructionExecutionError } from './instruction.js';

export class Return extends Instruction {
  static type: string = 'RETURN';
  static numberOfOperands = 2;

  constructor(private returnOffset: number, private copySize: number) {
    super();
  }

  execute(machineState: AvmMachineState, _stateManager: AvmStateManager): void {
    const returnData = machineState.memory
      .getSlice(this.returnOffset, this.copySize)
      .map(fvt => new Fr(fvt.toBigInt()));

    machineState.setReturnData(returnData);

    this.halt(machineState);
  }
}

export class Jump extends Instruction {
  static type: string = 'JUMP';
  static numberOfOperands = 1;

  constructor(private jumpOffset: number) {
    super();
  }

  execute(machineState: AvmMachineState, _stateManager: AvmStateManager): void {
    machineState.pc = this.jumpOffset;
  }
}

export class JumpI extends Instruction {
  static type: string = 'JUMPI';
  static numberOfOperands = 1;

  constructor(private jumpOffset: number, private condOffset: number) {
    super();
  }

  execute(machineState: AvmMachineState, _stateManager: AvmStateManager): void {
    const condition = machineState.memory.getAs<IntegralValue>(this.condOffset);

    // TODO: reconsider this casting
    if (condition.toBigInt() == 0n) {
      this.incrementPc(machineState);
    } else {
      machineState.pc = this.jumpOffset;
    }
  }
}

export class InternalCall extends Instruction {
  static type: string = 'INTERNALCALL';
  static numberOfOperands = 1;

  constructor(private jumpOffset: number) {
    super();
  }

  execute(machineState: AvmMachineState, _stateManager: AvmStateManager): void {
    machineState.internalCallStack.push(machineState.pc + 1);
    machineState.pc = this.jumpOffset;
  }
}

export class InternalReturn extends Instruction {
  static type: string = 'INTERNALRETURN';
  static numberOfOperands = 0;

  constructor() {
    super();
  }

  execute(machineState: AvmMachineState, _stateManager: AvmStateManager): void {
    const jumpOffset = machineState.internalCallStack.pop();
    if (jumpOffset === undefined) {
      throw new InstructionExecutionError('Internal call empty!');
    }
    machineState.pc = jumpOffset;
  }
}
