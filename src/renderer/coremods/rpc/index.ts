/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { Injector } from "@recelled";
import { BETA_WEBSITE_URL, LEGACY_WEBSITE_URL, WEBSITE_URL } from "src/constants";
import { filters, getFunctionKeyBySource, waitForModule } from "src/renderer/modules/webpack";
import { Jsonifiable } from "type-fest";

const injector = new Injector();

type Socket = Record<string, unknown> & {
  authorization: Record<string, unknown> & {
    scopes: string[];
  };
};

type RPCData = {
  args: Record<string, Jsonifiable | undefined>;
  cmd: string;
};

export type RPCCommand = {
  scope?:
    | string
    | {
        $any: string[];
      };
  handler: (
    data: RPCData,
  ) =>
    | Record<string, Jsonifiable | undefined>
    | Promise<Record<string, Jsonifiable | undefined>>
    | void
    | Promise<void>;
};

type Commands = Record<string, RPCCommand>;

type RPCMod = { commands: Commands };

let commands: Commands = {};

async function injectRpc(): Promise<void> {
  const rpcValidatorMod = await waitForModule<
    Record<string, (socket: Socket, client_id: string, origin: string) => Promise<void>>
  >(filters.bySource("Invalid Client ID"));
  const fetchApplicationsRPCKey = getFunctionKeyBySource(rpcValidatorMod, "Invalid Origin")!;

  injector.instead(rpcValidatorMod, fetchApplicationsRPCKey, (args, fn) => {
    const [, clientId, origin] = args;
    const isReCelledClient = clientId.startsWith("RECELLED-") || clientId.startsWith("REPLUGGED-");

    // From Replugged site
    if (origin === WEBSITE_URL || origin === BETA_WEBSITE_URL || origin === LEGACY_WEBSITE_URL) {
      args[0].authorization.scopes = ["REPLUGGED", "RECELLED"];
      return Promise.resolve();
    }

    // From localhost but for Replugged
    if (isReCelledClient && (!origin || new URL(origin).hostname === "localhost")) {
      args[0].authorization.scopes = ["RECELLED_LOCAL", "REPLUGGED_LOCAL"];
      return Promise.resolve();
    }

    // For Replugged but not from an allowed origin
    if (isReCelledClient) {
      throw new Error("Invalid Client ID");
    }

    return fn(...args);
  });

  const rpcMod = await waitForModule<RPCMod>(filters.byProps("setCommandHandler"));

  // Apply any existing commands to the RPC module
  rpcMod.commands = {
    ...rpcMod.commands,
    ...commands,
  };

  // Set the commands to the real commands object
  commands = rpcMod.commands;
}

/**
 * @param name Command name
 * @param command Command handler
 * @returns Unregister function
 */
export function registerRPCCommand(name: string, command: RPCCommand): () => void {
  if (!name.startsWith("RECELLED") && !name.startsWith("REPLUGGED"))
    throw new Error("RPC command name must start with RECELLED or REPLUGGED");
  if (name in commands) throw new Error("RPC command already exists");
  commands[name] = command;
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete commands[name];
  };
}

/**
 * @param name Command name
 */
export function unregisterRPCCommand(name: string): void {
  if (!name.startsWith("RECELLED") && !name.startsWith("REPLUGGED"))
    throw new Error("RPC command name must start with RECELLED");
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete commands[name];
}

export async function start(): Promise<void> {
  await injectRpc();
}
export function stop(): void {
  injector.uninjectAll();
}
