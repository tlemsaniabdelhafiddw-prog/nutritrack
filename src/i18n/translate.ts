import type { Messages } from './messages/en';
import { intlLocale, type Locale } from './config';

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Leaves<T> = T extends string ? never : { [K in keyof T & string]: T[K] extends string ? K : Join<K, Leaves<T[K]>> }[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Params = Record<string, string | number>;
export type Translator = ((key: MessageKey, params?: Params) => string) & {
  locale: Locale;
  num: (n: number, digits?: number) => string;
  date: (d: Date | string, opts?: Intl.DateTimeFormatOptions) => string;
};

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

export function createTranslator(locale: Locale, messages: Messages, fallback?: Messages): Translator {
  const tag = intlLocale[locale];
  const numberFormats = new Map<number, Intl.NumberFormat>();
  const t = ((key: MessageKey, params?: Params) => {
    const template = lookup(messages, key) ?? (fallback ? lookup(fallback, key) : undefined) ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => {
      const v = params[name];
      if (v === undefined) return `{${name}}`;
      return typeof v === 'number' ? t.num(v) : v;
    });
  }) as Translator;
  t.locale = locale;
  t.num = (n: number, digits = 0) => {
    let f = numberFormats.get(digits);
    if (!f) {
      f = new Intl.NumberFormat(tag, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
      numberFormats.set(digits, f);
    }
    return f.format(n);
  };
  t.date = (d, opts = { day: 'numeric', month: 'short' }) => {
    const date = typeof d === 'string' ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d) : d;
    return new Intl.DateTimeFormat(tag, { timeZone: typeof d === 'string' && d.length === 10 ? 'UTC' : undefined, ...opts }).format(date);
  };
  return t;
}
