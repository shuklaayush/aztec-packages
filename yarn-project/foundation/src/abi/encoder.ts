import { Fr } from '../fields/index.js';
import { ABIType, FunctionAbi } from './abi.js';
import { isAddressStruct, isFunctionSelectorStruct } from './utils.js';

/**
 * Encodes arguments for a function call.
 * Missing support for integer and string.
 */
class ArgumentEncoder {
  private flattened: Fr[] = [];

  constructor(private abi: FunctionAbi, private args: any[]) {}

  static typeSize(abiType: ABIType): number {
    switch (abiType.kind) {
      case 'field':
      case 'boolean':
      case 'integer':
        return 1;
      case 'string':
        return abiType.length;
      case 'array':
        return abiType.length * ArgumentEncoder.typeSize(abiType.type);
      case 'struct':
        return abiType.fields.reduce((acc, field) => acc + ArgumentEncoder.typeSize(field.type), 0);
      default: {
        const exhaustiveCheck: never = abiType;
        throw new Error(`Unhandled abi type: ${exhaustiveCheck}`);
      }
    }
  }

  /**
   * Encodes a single argument from the given type to field.
   * @param abiType - The abi type of the argument.
   * @param arg - The value to encode.
   * @param name - Name.
   */
  private encodeArgument(abiType: ABIType, arg: any, name?: string) {
    if (arg === undefined || arg == null) {
      throw new Error(`Undefined argument ${name ?? 'unnamed'} of type ${abiType.kind}`);
    }
    switch (abiType.kind) {
      case 'field':
        if (typeof arg === 'number') {
          this.flattened.push(new Fr(BigInt(arg)));
        } else if (typeof arg === 'bigint') {
          this.flattened.push(new Fr(arg));
        } else if (typeof arg === 'boolean') {
          this.flattened.push(new Fr(arg ? 1n : 0n));
        } else if (typeof arg === 'object') {
          if (Buffer.isBuffer(arg)) {
            this.flattened.push(Fr.fromBuffer(arg));
          } else if (typeof arg.toField === 'function') {
            this.flattened.push(arg.toField());
          } else {
            throw new Error(`Argument for ${name} cannot be serialized to a field`);
          }
        } else {
          throw new Error(`Invalid argument "${arg}" of type ${abiType.kind}`);
        }
        break;
      case 'boolean':
        this.flattened.push(new Fr(arg ? 1n : 0n));
        break;
      case 'array':
        for (let i = 0; i < abiType.length; i += 1) {
          this.encodeArgument(abiType.type, arg[i], `${name}[${i}]`);
        }
        break;
      case 'struct': {
        // If the abi expects a struct like { address: Field } and the supplied arg does not have
        // an address field in it, we try to encode it as if it were a field directly.
        const isAddress = isAddressStruct(abiType);
        if (isAddress && typeof arg.address === 'undefined' && typeof arg.inner === 'undefined') {
          this.encodeArgument({ kind: 'field' }, arg, `${name}.inner`);
          break;
        }
        if (isFunctionSelectorStruct(abiType)) {
          if (typeof arg.value === 'undefined') {
            this.encodeArgument({ kind: 'integer', sign: 'unsigned', width: 32 }, arg, `${name}.inner`);
          } else {
            this.encodeArgument({ kind: 'integer', sign: 'unsigned', width: 32 }, arg.value, `${name}.inner`);
          }
          break;
        }
        for (const field of abiType.fields) {
          // The ugly check bellow is here because of a `CompleteAddress`. Since it has `address` property but in ABI
          // it's called inner we set `field.name` here to `address` instead of using `field.name`. I know it's hacky
          // but using address.address in Noir looks stupid and renaming `address` param of `CompleteAddress`
          // to `inner` doesn't make sense.
          const fieldName = isAddress && arg.address !== undefined ? 'address' : field.name;
          this.encodeArgument(field.type, arg[fieldName], `${name}.${field.name}`);
        }
        break;
      }
      case 'integer':
        this.flattened.push(new Fr(arg));
        break;
      default:
        throw new Error(`Unsupported type: ${abiType.kind}`);
    }
  }

  /**
   * Encodes all the arguments for the given function ABI.
   * @returns The encoded arguments.
   */
  public encode() {
    for (let i = 0; i < this.abi.parameters.length; i += 1) {
      const parameterAbi = this.abi.parameters[i];
      this.encodeArgument(parameterAbi.type, this.args[i], parameterAbi.name);
    }
    return this.flattened;
  }
}

/**
 * Encodes all the arguments for a function call.
 * @param abi - The function ABI entry.
 * @param args - The arguments to encode.
 * @returns The encoded arguments.
 */
export function encodeArguments(abi: FunctionAbi, args: any[]) {
  return new ArgumentEncoder(abi, args).encode();
}

/**
 * Returns the size of the arguments for a function ABI.
 * @param abi - The function ABI entry.
 * @returns The size of the arguments.
 */
export function countArgumentsSize(abi: FunctionAbi) {
  return abi.parameters.reduce((acc, parameter) => acc + ArgumentEncoder.typeSize(parameter.type), 0);
}
