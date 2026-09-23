import { mock } from "bun:test";

// bun keeps the first evaluated mock of this module for the whole `bun test`
// process, and file order is not stable. Both suites call through this object
// so a later file can still replace the functions the earlier mock captured.
type Call = (...args: never[]) => unknown;

export type ClientsDouble = {
  writeContract: Call;
  readContract: Call;
  waitForTransactionReceipt: Call;
};

const KEY = "__lycorisFacilitatorClients";
const slot = globalThis as typeof globalThis & { [KEY]?: ClientsDouble };

function defaults(): ClientsDouble {
  return {
    writeContract: mock(async () => "0xattesttx"),
    readContract: mock(async () => 1000000000n),
    waitForTransactionReceipt: mock(async () => ({ status: "success" })),
  };
}

export const clientsDouble: ClientsDouble = slot[KEY] ?? defaults();
slot[KEY] = clientsDouble;

mock.module("./clients.js", () => ({
  account: "0xaccount",
  walletClient: {
    writeContract: (args: never) => clientsDouble.writeContract(args),
  },
  publicClient: {
    readContract: (args: never) => clientsDouble.readContract(args),
    waitForTransactionReceipt: (args: never) => clientsDouble.waitForTransactionReceipt(args),
    getCode: async () => "0x",
    verifyTypedData: async () => true,
  },
  facilitatorSigner: { address: "0xaccount" },
}));
