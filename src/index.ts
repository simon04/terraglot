//     (c) 2012-2021 Airbnb, Inc.
//     (c) 2021-2022 Simon Legner
//
//     TerraGlot may be freely distributed under the terms of the BSD
//     license. For all licensing information, details, and documentation:
//     https://github.com/simon04/terraglot/blob/master/LICENSE
//
// TerraGlot is a a tiny i18n helper library.
//
// This is a modern fork of [airbnb/polyglot.js](https://github.com/airbnb/polyglot.js)
// Polyglot.js is an I18n helper library written in JavaScript, made to
// work both in the browser and in Node. It provides a simple solution for
// interpolation and pluralization, based off of Airbnb's
// experience adding I18n functionality to its Backbone.js and Node apps.
//
// Polylglot is agnostic to your translation backend. It doesn't perform any
// translation; it simply gives you a way to manage translated phrases from
// your client- or server-side JavaScript application.
//

// #### Pluralization methods
// The string that separates the different phrase possibilities.
const delimiter = '||||';

type Phrases = Record<string, string | Record<string, string>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Substitutions = number | Record<string, any>;
type Language = string;
type PluralType = string;
interface PluralRules {
  pluralTypes: Record<PluralType, (n: number) => number>;
  pluralTypeToLanguages: Record<PluralType, Language[]>;
}

const russianPluralGroups = (n: number): number => {
  const lastTwo = n % 100;
  const end = lastTwo % 10;
  return lastTwo !== 11 && end === 1
    ? 0
    : 2 <= end && end <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
    ? 1
    : 2;
};

const defaultPluralRules: PluralRules = {
  // Mapping from pluralization group plural logic.
  pluralTypes: {
    arabic: (n) => {
      // http://www.arabeyes.org/Plural_Forms
      const lastTwo = n % 100;
      return n < 3 ? n : lastTwo >= 3 && lastTwo <= 10 ? 3 : lastTwo >= 11 ? 4 : 5;
    },
    bosnian_serbian: russianPluralGroups,
    chinese: () => 0,
    croatian: russianPluralGroups,
    french: (n) => (n >= 2 ? 1 : 0),
    german: (n) => (n !== 1 ? 1 : 0),
    russian: russianPluralGroups,
    lithuanian: (n) =>
      n % 10 === 1 && n % 100 !== 11
        ? 0
        : n % 10 >= 2 && n % 10 <= 9 && (n % 100 < 11 || n % 100 > 19)
        ? 1
        : 2,
    czech: (n) => (n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2),
    polish: (n) => {
      const end = n % 10;
      return n === 1 ? 0 : 2 <= end && end <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
    },
    icelandic: (n) => (n % 10 !== 1 || n % 100 === 11 ? 1 : 0),
    slovenian: (n) => {
      const lastTwo = n % 100;
      return lastTwo === 1 ? 0 : lastTwo === 2 ? 1 : lastTwo === 3 || lastTwo === 4 ? 2 : 3;
    }
  },

  // Mapping from pluralization group to individual language codes/locales.
  // Will look up based on exact match, if not found and it's a locale will parse the locale
  // for language code, and if that does not exist will default to 'en'
  pluralTypeToLanguages: {
    arabic: ['ar'],
    bosnian_serbian: ['bs-Latn-BA', 'bs-Cyrl-BA', 'srl-RS', 'sr-RS'],
    chinese: ['id', 'id-ID', 'ja', 'ko', 'ko-KR', 'lo', 'ms', 'th', 'th-TH', 'zh'],
    croatian: ['hr', 'hr-HR'],
    german: [
      'fa',
      'da',
      'de',
      'en',
      'es',
      'fi',
      'el',
      'he',
      'hi-IN',
      'hu',
      'hu-HU',
      'it',
      'nl',
      'no',
      'pt',
      'sv',
      'tr'
    ],
    french: ['fr', 'tl', 'pt-br'],
    russian: ['ru', 'ru-RU'],
    lithuanian: ['lt'],
    czech: ['cs', 'cs-CZ', 'sk'],
    polish: ['pl'],
    icelandic: ['is'],
    slovenian: ['sl-SL']
  }
};

function langToTypeMap(mapping: Record<string, string[]>): Record<Language, PluralType> {
  const ret: Record<Language, PluralType> = {};
  Object.keys(mapping).forEach((type) => {
    mapping[type].forEach((lang) => {
      ret[lang] = type;
    });
  });
  return ret;
}

function pluralTypeName(pluralRules: PluralRules, locale: Language): string {
  const langToPluralType = langToTypeMap(pluralRules.pluralTypeToLanguages);
  return (
    langToPluralType[locale] || langToPluralType[locale.split(/-/, 1)[0]] || langToPluralType['en']
  );
}

function pluralTypeIndex(pluralRules: PluralRules, locale: Language, count: number): number {
  return pluralRules.pluralTypes[pluralTypeName(pluralRules, locale)](count);
}

function escape(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function constructTokenRegex(opts?: { prefix: string; suffix: string }): RegExp {
  const prefix = opts?.prefix || '%{';
  const suffix = opts?.suffix || '}';

  if (prefix === delimiter || suffix === delimiter) {
    throw new RangeError('"' + delimiter + '" token is reserved for pluralization');
  }

  return new RegExp(escape(prefix) + '(.*?)' + escape(suffix), 'g');
}

const defaultTokenRegex = /%\{(.*?)\}/g;

// ### transformPhrase(phrase, substitutions, locale)
//
// Takes a phrase string and transforms it by choosing the correct
// plural form and interpolating it.
//
//     transformPhrase('Hello, %{name}!', {name: 'Spike'});
//     // "Hello, Spike!"
//
// The correct plural form is selected if substitutions.smart_count
// is set. You can pass in a number instead of an Object as `substitutions`
// as a shortcut for `smart_count`.
//
//     transformPhrase('%{smart_count} new messages |||| 1 new message', {smart_count: 1}, 'en');
//     // "1 new message"
//
//     transformPhrase('%{smart_count} new messages |||| 1 new message', {smart_count: 2}, 'en');
//     // "2 new messages"
//
//     transformPhrase('%{smart_count} new messages |||| 1 new message', 5, 'en');
//     // "5 new messages"
//
// You should pass in a third argument, the locale, to specify the correct plural type.
// It defaults to `'en'` with 2 plural forms.
function transformPhrase(
  phrase: string,
  substitutions: Substitutions,
  locale: string,
  tokenRegex?: RegExp,
  pluralRules?: PluralRules
): string {
  if (typeof phrase !== 'string') {
    throw new TypeError('TerraGlot.transformPhrase expects argument #1 to be string');
  }

  if (substitutions == null) {
    return phrase;
  }

  let result = phrase;
  const interpolationRegex = tokenRegex || defaultTokenRegex;
  const pluralRulesOrDefault = pluralRules || defaultPluralRules;

  // allow number as a pluralization shortcut
  const smart_count: number | undefined =
    typeof substitutions === 'number' ? substitutions : substitutions.smart_count;
  const options =
    typeof substitutions === 'number' ? { smart_count: substitutions } : substitutions;

  // Select plural form: based on a phrase text that contains `n`
  // plural forms separated by `delimiter`, a `locale`, and a `substitutions.smart_count`,
  // choose the correct plural form. This is only done if `count` is set.
  if (smart_count !== undefined && result) {
    const texts = result.split(delimiter);
    result = texts[pluralTypeIndex(pluralRulesOrDefault, locale || 'en', smart_count)] || texts[0];
    if (typeof result.trim === 'function') {
      result = result.trim();
    }
  }

  // Interpolate: Creates a `RegExp` object for each interpolation placeholder.
  result = result.replace(
    interpolationRegex,
    (expression, argument) => options[argument] ?? expression
  );
  return result;
}

interface TerraGlotOptions {
  phrases: Phrases;
  locale: Language;
  allowMissing: boolean;
  onMissingKey: typeof transformPhrase;
  interpolation: {
    prefix: string;
    suffix: string;
  };
  pluralRules: PluralRules;
  warn: (message: string) => void;
}

export default class TerraGlot {
  phrases: Phrases;
  currentLocale: Language;
  onMissingKey?: typeof transformPhrase;
  warn: (message: string) => void;
  tokenRegex: RegExp;
  pluralRules: PluralRules;

  // ### TerraGlot class constructor
  constructor(opts: Partial<TerraGlotOptions> = {}) {
    this.phrases = {};
    this.extend(opts.phrases || {});
    this.currentLocale = opts.locale || 'en';
    const allowMissing = opts.allowMissing ? transformPhrase : undefined;
    this.onMissingKey = typeof opts.onMissingKey === 'function' ? opts.onMissingKey : allowMissing;
    this.warn = opts.warn || console.warn;
    this.tokenRegex = constructTokenRegex(opts.interpolation);
    this.pluralRules = opts.pluralRules || defaultPluralRules;
  }

  // ### terraglot.locale([locale])
  //
  // Get or set locale. Internally, TerraGlot only uses locale for pluralization.
  locale(newLocale?: Language): Language {
    if (newLocale) this.currentLocale = newLocale;
    return this.currentLocale;
  }

  // ### terraglot.extend(phrases)
  //
  // Use `extend` to tell TerraGlot how to translate a given key.
  //
  //     terraglot.extend({
  //       "hello": "Hello",
  //       "hello_name": "Hello, %{name}"
  //     });
  //
  // The key can be any string.  Feel free to call `extend` multiple times;
  // it will override any phrases with the same key, but leave existing phrases
  // untouched.
  //
  // It is also possible to pass nested phrase objects, which get flattened
  // into an object with the nested keys concatenated using dot notation.
  //
  //     terraglot.extend({
  //       "nav": {
  //         "hello": "Hello",
  //         "hello_name": "Hello, %{name}",
  //         "sidebar": {
  //           "welcome": "Welcome"
  //         }
  //       }
  //     });
  //
  //     console.log(terraglot.phrases);
  //     // {
  //     //   'nav.hello': 'Hello',
  //     //   'nav.hello_name': 'Hello, %{name}',
  //     //   'nav.sidebar.welcome': 'Welcome'
  //     // }
  //
  // `extend` accepts an optional second argument, `prefix`, which can be used
  // to prefix every key in the phrases object with some string, using dot
  // notation.
  //
  //     terraglot.extend({
  //       "hello": "Hello",
  //       "hello_name": "Hello, %{name}"
  //     }, "nav");
  //
  //     console.log(terraglot.phrases);
  //     // {
  //     //   'nav.hello': 'Hello',
  //     //   'nav.hello_name': 'Hello, %{name}'
  //     // }
  //
  // This feature is used internally to support nested phrase objects.
  extend(morePhrases: Phrases, prefix?: string): void {
    Object.keys(morePhrases).forEach((key) => {
      const phrase = morePhrases[key];
      const prefixedKey = prefix ? prefix + '.' + key : key;
      if (typeof phrase === 'object') {
        this.extend(phrase, prefixedKey);
      } else {
        this.phrases[prefixedKey] = phrase;
      }
    });
  }

  // ### terraglot.unset(phrases)
  // Use `unset` to selectively remove keys from a TerraGlot instance.
  //
  //     terraglot.unset("some_key");
  //     terraglot.unset({
  //       "hello": "Hello",
  //       "hello_name": "Hello, %{name}"
  //     });
  //
  // The unset method can take either a string (for the key), or an object hash with
  // the keys that you would like to unset.
  unset(morePhrases: Phrases, prefix?: string): void {
    if (typeof morePhrases === 'string') {
      delete this.phrases[morePhrases];
    } else {
      Object.keys(morePhrases).forEach((key) => {
        const phrase = morePhrases[key];
        const prefixedKey = prefix ? prefix + '.' + key : key;
        if (typeof phrase === 'object') {
          this.unset(phrase, prefixedKey);
        } else {
          delete this.phrases[prefixedKey];
        }
      });
    }
  }

  // ### terraglot.clear()
  //
  // Clears all phrases. Useful for special cases, such as freeing
  // up memory if you have lots of phrases but no longer need to
  // perform any translation. Also used internally by `replace`.
  clear(): void {
    this.phrases = {};
  }

  // ### terraglot.replace(phrases)
  //
  // Completely replace the existing phrases with a new set of phrases.
  // Normally, just use `extend` to add more phrases, but under certain
  // circumstances, you may want to make sure no old phrases are lying around.
  replace(newPhrases: Phrases): void {
    this.clear();
    this.extend(newPhrases);
  }

  // ### terraglot.t(key, options)
  //
  // The most-used method. Provide a key, and `t` will return the
  // phrase.
  //
  //     terraglot.t("hello");
  //     => "Hello"
  //
  // The phrase value is provided first by a call to `terraglot.extend()` or
  // `terraglot.replace()`.
  //
  // Pass in an object as the second argument to perform interpolation.
  //
  //     terraglot.t("hello_name", {name: "Spike"});
  //     => "Hello, Spike"
  //
  // If you like, you can provide a default value in case the phrase is missing.
  // Use the special option key "_" to specify a default.
  //
  //     terraglot.t("i_like_to_write_in_language", {
  //       _: "I like to write in %{language}.",
  //       language: "JavaScript"
  //     });
  //     => "I like to write in JavaScript."
  //
  t(key: string, opts: Substitutions = {}): string {
    const phrase = this.phrases[key];
    if (typeof phrase === 'string') {
      return transformPhrase(phrase, opts, this.currentLocale, this.tokenRegex, this.pluralRules);
    } else if (typeof opts === 'object' && typeof opts._ === 'string') {
      return transformPhrase(opts._, opts, this.currentLocale, this.tokenRegex, this.pluralRules);
    } else if (this.onMissingKey) {
      return this.onMissingKey(key, opts, this.currentLocale, this.tokenRegex, this.pluralRules);
    } else {
      this.warn('Missing translation for key: "' + key + '"');
      return key;
    }
  }

  // ### terraglot.has(key)
  //
  // Check if polyglot has a translation for given key
  has(key: string): boolean {
    return this.phrases[key] !== undefined;
  }

  // export transformPhrase
  static transformPhrase(
    phrase: string,
    substitutions: Substitutions,
    locale: string,
    tokenRegex?: RegExp,
    pluralRules?: PluralRules
  ): string {
    return transformPhrase(phrase, substitutions, locale, tokenRegex, pluralRules);
  }
}
