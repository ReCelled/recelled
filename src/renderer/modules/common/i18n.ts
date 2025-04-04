import type {
  FormatFunction,
  IntlManager,
  IntlMessageGetter,
  MessageLoader,
  TypedIntlMessageGetter,
  astFormatter,
  makeReactFormatter,
  markdownFormatter,
  stringFormatter,
} from "@discord/intl";
import {
  filters,
  getExportsForProps,
  getFunctionBySource,
  waitForModule,
  waitForProps,
} from "../webpack";

type MessagesBinds = Record<string, TypedIntlMessageGetter<object>>;

type MessagesBindsProxy = MessagesBinds & {
  $$baseObject: MessagesBinds;
  $$loader: MessageLoader;
};

interface Locale {
  value: string;
  name: string;
  localizedName: IntlMessageGetter;
}

interface Language {
  name: string;
  englishName: string;
  code: string;
  postgresLang: string;
  enabled: boolean;
  enabledAPI?: boolean;
}

export interface I18n {
  getAvailableLocales: () => Locale[];
  getLanguages: () => Language[];
  intl: IntlManager & {
    format: FormatFunction<ReturnType<typeof makeReactFormatter>>;
    formatToPlainString: FormatFunction<typeof stringFormatter>;
    formatToMarkdownString: FormatFunction<typeof markdownFormatter>;
    formatToParts: FormatFunction<typeof astFormatter>;
  };
  t: MessagesBindsProxy;
}

export interface Hash {
  runtimeHashMessageKey: (key: string) => string;
}

const getI18n = async (): Promise<I18n> => {
  const intlMod = await waitForModule<I18n>(filters.bySource(/new \w+\.IntlManager/));
  const getAvailableLocales = getFunctionBySource<I18n["getAvailableLocales"]>(
    intlMod,
    ".runtimeHashMessageKey",
  )!;
  const getLanguages = getFunctionBySource<I18n["getLanguages"]>(intlMod, /{return \w+\(\d+\)}/)!;
  const intl = getExportsForProps<I18n["intl"]>(intlMod, ["defaultLocale", "currentLocale"])!;

  // For it to not break on stable
  const discordT =
    intlMod.t ?? getExportsForProps<I18n["t"]>(intlMod, ["$$loader", "$$baseObject"])!;

  const { runtimeHashMessageKey } = await waitForProps<Hash>("runtimeHashMessageKey");

  const t = new Proxy(discordT.$$baseObject, {
    get: (_t, key: string) => discordT[runtimeHashMessageKey(key)],
  }) as MessagesBindsProxy;

  return { getAvailableLocales, getLanguages, intl, t };
};

export default getI18n();
