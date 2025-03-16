import { execSync } from "child_process";
import { existsSync } from "fs";
import { chown, copyFile, mkdir, rename, rm, stat, writeFile } from "fs/promises";
import path, { join, sep } from "path";
import { fileURLToPath } from "url";
import { createPackage, extractAll, extractFile, statFile, uncache } from "@electron/asar";
import { CONFIG_PATH } from "src/util.mjs";
import { entryPoint as argEntryPoint, exitCode } from "./index.mjs";
import type { DiscordPlatform, PlatformModule, ProcessInfo } from "./types.mjs";
import {
  AnsiEscapes,
  PlatformNames,
  getCommand,
  getProcessInfoByName,
  getUserData,
  killProcessByPID,
  openProcess,
} from "./util.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
let processInfo: ProcessInfo | ProcessInfo[] | null;

export const isDiscordInstalled = async (appDir: string, silent?: boolean): Promise<boolean> => {
  try {
    await stat(appDir);
    return true;
  } catch {
    if (!silent) {
      console.error(
        `${AnsiEscapes.RED}The Discord installation you specified isn't installed on this device!${AnsiEscapes.RESET}`,
      );
    }
    return false;
  }
};

// If app.orig.asar but no app.asar, move app.orig.asar to app.asar
// Fixes a case where app.asar was deleted (uncelled) but app.orig.asar couldn't be moved back
// Fixes incase using old version of recelled
export const correctMissingMainAsar = async (appDir: string): Promise<boolean> => {
  const appAsar = join(appDir, "..", "app.asar");
  const appOrigAsar = join(appDir, "..", "app.orig.asar");
  const tempDir = join(appDir, "..", "temp");

  try {
    await stat(appOrigAsar);
    console.warn(
      `${AnsiEscapes.YELLOW}Your Discord installation was not properly uncelled, attempting to fix...${AnsiEscapes.RESET}`,
    );

    if (process.platform === "linux") {
      try {
        await stat(appAsar);
        await rm(appAsar, { recursive: true, force: true });
      } catch {}

      try {
        await stat(tempDir);
        await rm(tempDir, { recursive: true, force: true });
      } catch {}
    }

    try {
      await stat(appAsar);
    } catch {
      try {
        await rename(appOrigAsar, appAsar);
        console.log(
          `${AnsiEscapes.GREEN}Fixed your Discord installation successfully! Continuing with ReCelled installation...${AnsiEscapes.RESET}`,
          "\n",
        );
      } catch {
        console.error(
          `${AnsiEscapes.RED}Failed to fix your Discord installation, please try uncelling and incelling again.${AnsiEscapes.RESET}`,
          "\n",
        );
        console.error("If the error persists, please reinstall Discord and try again.");
        return false;
      }
    }
  } catch {}

  return true;
};

export const isCelled = async (appDir: string): Promise<boolean> => {
  try {
    if (process.platform === "linux") {
      uncache(appDir);
      await statFile(appDir, "app.orig");
    } else await stat(join(appDir, "..", "app.orig.asar"));
    return true;
  } catch {
    return false;
  }
};

export const inject = async (
  { getAppDir }: PlatformModule,
  platform: DiscordPlatform,
  prod: boolean,
): Promise<boolean> => {
  const appDir = await getAppDir(platform);
  if (!(await correctMissingMainAsar(appDir))) return false;
  if (!(await isDiscordInstalled(appDir))) return false;

  if (await isCelled(appDir)) {
    /*
     * @todo: verify if there is nothing in discord_desktop_core as well
     * @todo: prompt to automatically uninject and continue
     */
    console.error(
      `${AnsiEscapes.RED}Looks like you already have an injector in place.${AnsiEscapes.RESET} If you already have BetterDiscord or another client mod injected, ReCelled cannot run along with it! Please uninstall it before continuing.`,
      "\n",
    );
    console.error(
      `If you already have ReCelled installed and want to replace it, use ${
        AnsiEscapes.GREEN
      }${getCommand({ action: "recell", prod, platform })}${
        AnsiEscapes.RESET
      } to uncell and incell again.`,
    );
    return false;
  }

  const fileToCheck = join(dirname, "..", "..", prod ? "recelled.asar" : "dist/main.js");
  const fileToCheckExists = await stat(fileToCheck)
    .then(() => true)
    .catch(() => false);
  if (!fileToCheckExists) {
    console.error(
      `${AnsiEscapes.RED}Looks like you haven't built ReCelled yet!${AnsiEscapes.RESET}`,
    );
    console.error(
      `To build for development, run ${AnsiEscapes.GREEN}pnpm run build${AnsiEscapes.RESET}`,
    );
    console.error(
      `To build for production, run ${AnsiEscapes.GREEN}pnpm run bundle${AnsiEscapes.RESET}`,
    );
    return false;
  }

  const entryPoint =
    argEntryPoint ??
    (prod ? join(CONFIG_PATH, "recelled.asar") : join(dirname, "..", "..", "dist/main.js"));

  const entryPointDir = path.dirname(entryPoint);

  if (appDir.includes("flatpak")) {
    const discordName = platform === "canary" ? "DiscordCanary" : "Discord";
    const overrideCommand = `${
      appDir.startsWith("/var") ? "sudo flatpak override" : "flatpak override --user"
    } com.discordapp.${discordName} --filesystem=${prod ? entryPointDir : join(dirname, "..", "..")}`;

    console.log(
      `${AnsiEscapes.YELLOW}Flatpak detected, allowing Discord access to ReCelled files (${prod ? entryPointDir : join(dirname, "..", "..")})${AnsiEscapes.RESET}`,
    );
    execSync(overrideCommand);
  }

  try {
    await rename(appDir, join(appDir, "..", "app.orig.asar"));
    // For discord_arch_electron
    if (existsSync(join(appDir, "..", "app.asar.unpacked"))) {
      await rename(
        join(appDir, "..", "app.asar.unpacked"),
        join(appDir, "..", "app.orig.asar.unpacked"),
      );
    }
  } catch {
    console.error(
      `${AnsiEscapes.RED}Failed to rename app.asar while incelling. If Discord is open, make sure it is closed.${AnsiEscapes.RESET}`,
    );
    process.exit(exitCode);
  }

  if (prod) {
    await copyFile(join(dirname, "..", "..", "recelled.asar"), entryPoint);
    if (["linux", "darwin"].includes(process.platform)) {
      try {
        // Adjust ownership of config folder and asar file to match the parent config folder
        // We want to make sure all ReCelled files are owned by the user
        const { uid, gid } = await stat(join(CONFIG_PATH, ".."));
        await chown(entryPoint, uid, gid);
      } catch {}
    }
  }
  const tempDir = join(appDir, "..", "temp");
  await mkdir(tempDir);
  const { main: discordMain } = JSON.parse(
    extractFile(join(appDir, "..", "app.orig.asar"), "package.json").toString("utf-8"),
  );
  await Promise.all([
    writeFile(
      join(tempDir, "index.js"),
      `require("${entryPoint.replace(RegExp(sep.repeat(2), "g"), "/")}")`,
    ),
    writeFile(
      join(appDir, "..", "temp", "package.json"),
      JSON.stringify({
        discordMain,
        main: "index.js",
        name: "discord",
      }),
    ),
    process.platform === "linux" &&
      (extractAll(join(appDir, "..", "app.orig.asar"), join(tempDir, "app.orig")),
      rename(join(appDir, "..", "app.orig.asar"), join(tempDir, "app.orig.asar"))),
  ]);

  await createPackage(tempDir, appDir);
  await rm(tempDir, { recursive: true, force: true });
  return true;
};

export const uninject = async (
  { getAppDir }: PlatformModule,
  platform: DiscordPlatform,
): Promise<boolean> => {
  const appDir = await getAppDir(platform);
  if (
    !(await isDiscordInstalled(appDir, true)) &&
    !(await isDiscordInstalled(join(appDir, "..", "app.orig.asar")))
  )
    return false;

  if (!(await isCelled(appDir))) {
    console.error(
      `${AnsiEscapes.BOLD}${AnsiEscapes.RED}There is nothing to uncell. You are already running Discord without mods.${AnsiEscapes.RESET}`,
    );
    return false;
  }

  if (process.platform === "linux") {
    const origAsar = await extractFile(appDir, "app.orig.asar");
    await rm(appDir, { recursive: true, force: true });
    await writeFile(appDir, origAsar);
  } else {
    await rm(appDir, { recursive: true, force: true });
    await rename("app.orig.asar", appDir);
  }
  // For discord_arch_electron
  if (existsSync(join(appDir, "..", "app.orig.asar.unpacked"))) {
    await rename(
      join(appDir, "..", "app.orig.asar.unpacked"),
      join(appDir, "..", "app.asar.unpacked"),
    );
    process.exit(exitCode);
  }

  return true;
};

export const smartInject = async (
  cmd: "uninject" | "inject",
  recell: boolean,
  platformModule: PlatformModule,
  platform: DiscordPlatform,
  production: boolean,
  noRelaunch: boolean,
): Promise<boolean> => {
  let result;

  const processName =
    process.platform === "darwin"
      ? PlatformNames[platform]
      : PlatformNames[platform].replace(" ", "");
  if (!noRelaunch) {
    try {
      if ((recell && cmd === "uninject") || !recell) {
        processInfo = getProcessInfoByName(processName)!;
        await Promise.all(processInfo.map((info) => killProcessByPID(info.pid)));
      }
    } catch {}
  }

  result =
    cmd === "uninject"
      ? await uninject(platformModule, platform)
      : await inject(platformModule, platform, production);

  if (!noRelaunch) {
    if (((recell && cmd !== "uninject") || !recell) && processInfo) {
      const appDir = await platformModule.getAppDir(platform);
      switch (process.platform) {
        case "win32":
          openProcess(
            join(appDir, "..", "..", "..", "Update"),
            ["--processStart", `${processName}.exe`],
            { detached: true, stdio: "ignore" },
          );
          break;
        case "linux":
          openProcess(join(appDir, "..", "..", processName), [], {
            ...getUserData(),
            detached: true,
            stdio: "ignore",
          });
          break;
        case "darwin":
          openProcess(`open -a "${processName}.app"`);
          break;
      }
    }
  }

  return result;
};
