/*
IPC events:
- RECELLED_LIST_THEMES: returns an array of all valid themes available
- RECELLED_UNINSTALL_THEME: uninstalls a theme by name
*/

import { readFile, readdir, readlink, rm, stat, unlink } from "fs/promises";
import { extname, join, sep } from "path";
import { ipcMain, shell } from "electron";
import { ReCelledIpcChannels, type ReCelledTheme } from "../../types";
import { theme } from "../../types/addon";
import { CONFIG_PATHS, extractAddon } from "src/util.mjs";
import { type Dirent, type Stats } from "fs";

const THEMES_DIR = CONFIG_PATHS.themes;
const TMP_DIR = CONFIG_PATHS.temp_addons;

export const isFileATheme = (f: Dirent | Stats, name: string): boolean => {
  return f.isDirectory() || (f.isFile() && extname(name) === ".asar");
};

async function getTheme(path: string): Promise<ReCelledTheme> {
  const isAsar = path.includes(".asar");
  const themePath = join(THEMES_DIR, path);
  const realThemePath = isAsar ? join(TMP_DIR, path.replace(/\.asar$/, "")) : themePath; // Remove ".asar" from the directory name
  if (isAsar) extractAddon(themePath, realThemePath);

  const manifestPath = join(realThemePath, "manifest.json");

  if (!manifestPath.startsWith(`${realThemePath}${sep}`)) {
    // Ensure file changes are restricted to the base path
    throw new Error("Invalid theme name");
  }

  const manifest: unknown = JSON.parse(
    await readFile(manifestPath, {
      encoding: "utf-8",
    }),
  );

  return {
    path,
    manifest: theme.parse(manifest),
  };
}

ipcMain.handle(
  ReCelledIpcChannels.GET_THEME,
  async (_, path: string): Promise<ReCelledTheme | undefined> => {
    try {
      return await getTheme(path);
    } catch {}
  },
);

ipcMain.handle(ReCelledIpcChannels.LIST_THEMES, async (): Promise<ReCelledTheme[]> => {
  const themes = [];

  const themeDirs = (
    await Promise.all(
      (
        await readdir(THEMES_DIR, {
          withFileTypes: true,
        })
      ).map(async (f) => {
        if (isFileATheme(f, f.name)) return f;
        if (f.isSymbolicLink()) {
          const actualPath = await readlink(join(THEMES_DIR, f.name));
          const actualFile = await stat(actualPath);
          if (isFileATheme(actualFile, actualPath)) return f;
        }
      }),
    )
  ).filter(Boolean) as Dirent[];

  for (const themeDir of themeDirs) {
    try {
      themes.push(await getTheme(themeDir.name));
    } catch (e) {
      console.error(e);
    }
  }

  return themes;
});

ipcMain.handle(ReCelledIpcChannels.UNINSTALL_THEME, async (_, themeName: string) => {
  const isAsar = themeName.includes(".asar");
  const themePath = join(THEMES_DIR, themeName);
  const realThemePath = isAsar ? join(TMP_DIR, themeName.replace(/\.asar$/, "")) : themePath; // Remove ".asar" from the directory name

  if (!realThemePath.startsWith(`${isAsar ? TMP_DIR : THEMES_DIR}${sep}`)) {
    throw new Error("Invalid theme name");
  }

  if (isAsar) {
    await unlink(themePath);
    await rm(realThemePath, { recursive: true });
  } else await rm(themePath, { recursive: true });
});

ipcMain.on(ReCelledIpcChannels.OPEN_THEMES_FOLDER, () => shell.openPath(THEMES_DIR));
