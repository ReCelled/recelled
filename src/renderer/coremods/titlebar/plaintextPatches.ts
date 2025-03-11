import { init } from "src/renderer/apis/settings";
import { type GeneralSettings, type PlaintextPatch, defaultSettings } from "src/types";

const generalSettings = init<GeneralSettings, keyof typeof defaultSettings>(
  "dev.recelled.Settings",
  defaultSettings,
);

const replacements = [
  {
    match: /\(0,.\.getPlatform\)\(\)/,
    replace: `"WINDOWS"`,
  },
];

export default (navigator.userAgent.includes("Linux") && generalSettings.get("titlebar")
  ? [
      {
        find: ".appAsidePanelWrapper,",
        replacements,
      },
      {
        find: ".winButtons",
        replacements,
      },
    ]
  : []) as PlaintextPatch[];
