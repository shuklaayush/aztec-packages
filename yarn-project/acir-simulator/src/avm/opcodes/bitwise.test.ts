import { mock } from 'jest-mock-extended';

import { AvmMachineState } from '../avm_machine_state.js';
import { TypeTag, Uint16, Uint32 } from '../avm_memory_types.js';
import { AvmStateManager } from '../avm_state_manager.js';
import { And, Not, Or, Shl, Shr, Xor } from './bitwise.js';

describe('Bitwise instructions', () => {
  let machineState: AvmMachineState;
  let stateManager = mock<AvmStateManager>();

  beforeEach(() => {
    machineState = new AvmMachineState([]);
    stateManager = mock<AvmStateManager>();
  });

  it('Should AND correctly over integral types', () => {
    machineState.memory.set(0, new Uint32(0b11111110010011100100n));
    machineState.memory.set(1, new Uint32(0b11100100111001001111n));

    new And(0, 1, 2, TypeTag.UINT32).execute(machineState, stateManager);

    const actual = machineState.memory.get(2);
    expect(actual).toEqual(new Uint32(0b11100100010001000100n));
  });

  it('Should OR correctly over integral types', () => {
    const a = new Uint32(0b11111110010011100100n);
    const b = new Uint32(0b11100100111001001111n);

    machineState.memory.set(0, a);
    machineState.memory.set(1, b);

    new Or(0, 1, 2, TypeTag.UINT32).execute(machineState, stateManager);

    const expected = new Uint32(0b11111110111011101111n);
    const actual = machineState.memory.get(2);
    expect(actual).toEqual(expected);
  });

  it('Should XOR correctly over integral types', () => {
    const a = new Uint32(0b11111110010011100100n);
    const b = new Uint32(0b11100100111001001111n);

    machineState.memory.set(0, a);
    machineState.memory.set(1, b);

    new Xor(0, 1, 2, TypeTag.UINT32).execute(machineState, stateManager);

    const expected = new Uint32(0b00011010101010101011n);
    const actual = machineState.memory.get(2);
    expect(actual).toEqual(expected);
  });

  describe('SHR', () => {
    it('Should shift correctly 0 positions over integral types', () => {
      const a = new Uint32(0b11111110010011100100n);
      const b = new Uint32(0n);

      machineState.memory.set(0, a);
      machineState.memory.set(1, b);

      new Shr(0, 1, 2, TypeTag.UINT32).execute(machineState, stateManager);

      const expected = a;
      const actual = machineState.memory.get(2);
      expect(actual).toEqual(expected);
    });

    it('Should shift correctly 2 positions over integral types', () => {
      const a = new Uint32(0b11111110010011100100n);
      const b = new Uint32(2n);

      machineState.memory.set(0, a);
      machineState.memory.set(1, b);

      new Shr(0, 1, 2, TypeTag.UINT32).execute(machineState, stateManager);

      const expected = new Uint32(0b00111111100100111001n);
      const actual = machineState.memory.get(2);
      expect(actual).toEqual(expected);
    });

    it('Should shift correctly 19 positions over integral types', () => {
      const a = new Uint32(0b11111110010011100100n);
      const b = new Uint32(19n);

      machineState.memory.set(0, a);
      machineState.memory.set(1, b);

      new Shr(0, 1, 2, TypeTag.UINT32).execute(machineState, stateManager);

      const expected = new Uint32(0b01n);
      const actual = machineState.memory.get(2);
      expect(actual).toEqual(expected);
    });
  });

  describe('SHL', () => {
    it('Should shift correctly 0 positions over integral types', () => {
      const a = new Uint32(0b11111110010011100100n);
      const b = new Uint32(0n);

      machineState.memory.set(0, a);
      machineState.memory.set(1, b);

      new Shl(0, 1, 2, TypeTag.UINT32).execute(machineState, stateManager);

      const expected = a;
      const actual = machineState.memory.get(2);
      expect(actual).toEqual(expected);
    });

    it('Should shift correctly 2 positions over integral types', () => {
      const a = new Uint32(0b11111110010011100100n);
      const b = new Uint32(2n);

      machineState.memory.set(0, a);
      machineState.memory.set(1, b);

      new Shl(0, 1, 2, TypeTag.UINT32).execute(machineState, stateManager);

      const expected = new Uint32(0b1111111001001110010000n);
      const actual = machineState.memory.get(2);
      expect(actual).toEqual(expected);
    });

    it('Should shift correctly over bit limit over integral types', () => {
      const a = new Uint16(0b1110010011100111n);
      const b = new Uint16(17n);

      machineState.memory.set(0, a);
      machineState.memory.set(1, b);

      new Shl(0, 1, 2, TypeTag.UINT16).execute(machineState, stateManager);

      const expected = new Uint16(0n);
      const actual = machineState.memory.get(2);
      expect(actual).toEqual(expected);
    });

    it('Should truncate when shifting over bit size over integral types', () => {
      const a = new Uint16(0b1110010011100111n);
      const b = new Uint16(2n);

      machineState.memory.set(0, a);
      machineState.memory.set(1, b);

      new Shl(0, 1, 2, TypeTag.UINT16).execute(machineState, stateManager);

      const expected = new Uint16(0b1001001110011100n);
      const actual = machineState.memory.get(2);
      expect(actual).toEqual(expected);
    });
  });

  it('Should NOT correctly over integral types', () => {
    const a = new Uint16(0b0110010011100100n);

    machineState.memory.set(0, a);

    new Not(0, 1, TypeTag.UINT16).execute(machineState, stateManager);

    const expected = new Uint16(0b1001101100011011n); // high bits!
    const actual = machineState.memory.get(1);
    expect(actual).toEqual(expected);
  });
});
