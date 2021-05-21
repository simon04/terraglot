'use strict';

var Polyglot = require('../');

describe('t', () => {
  var phrases = {
    hello: 'Hello',
    hi_name_welcome_to_place: 'Hi, %{name}, welcome to %{place}!',
    name_your_name_is_name: '%{name}, your name is %{name}!',
    empty_string: ''
  };

  var polyglot;
  beforeEach(() => {
    polyglot = new Polyglot({ phrases: phrases });
  });

  it('translates a simple string', () => {
    expect(polyglot.t('hello')).toBe('Hello');
  });

  it('returns the key if translation not found', () => {
    expect(polyglot.t('bogus_key')).toBe('bogus_key');
  });

  it('interpolates', () => {
    expect(polyglot.t('hi_name_welcome_to_place', {
      name: 'Spike',
      place: 'the webz'
    })).toBe('Hi, Spike, welcome to the webz!');
  });

  it('interpolates with missing substitutions', () => {
    expect(polyglot.t('hi_name_welcome_to_place', {
      place: undefined
    })).toBe('Hi, %{name}, welcome to %{place}!');
  });

  it('interpolates the same placeholder multiple times', () => {
    expect(polyglot.t('name_your_name_is_name', {
      name: 'Spike'
    })).toBe('Spike, your name is Spike!');
  });

  it('allows you to supply default values', () => {
    expect(polyglot.t('can_i_call_you_name', {
      _: 'Can I call you %{name}?',
      name: 'Robert'
    })).toBe('Can I call you Robert?');
  });

  it('returns the non-interpolated key if not initialized with allowMissing and translation not found', () => {
    expect(polyglot.t('Welcome %{name}', {
      name: 'Robert'
    })).toBe('Welcome %{name}');
  });

  it('returns an interpolated key if initialized with allowMissing and translation not found', () => {
    var instance = new Polyglot({ phrases: phrases, allowMissing: true });
    expect(instance.t('Welcome %{name}', {
      name: 'Robert'
    })).toBe('Welcome Robert');
  });

  describe('custom interpolation syntax', () => {
    var createWithInterpolation = function (interpolation) {
      return new Polyglot({ phrases: {}, allowMissing: true, interpolation: interpolation });
    };

    it('interpolates with the specified custom token syntax', () => {
      var instance = createWithInterpolation({ prefix: '{{', suffix: '}}' });
      expect(instance.t('Welcome {{name}}', {
        name: 'Robert'
      })).toBe('Welcome Robert');
    });

    it('interpolates if the prefix and suffix are the same', () => {
      var instance = createWithInterpolation({ prefix: '|', suffix: '|' });
      expect(instance.t('Welcome |name|, how are you, |name|?', {
        name: 'Robert'
      })).toBe('Welcome Robert, how are you, Robert?');
    });

    it('interpolates when using regular expression tokens', () => {
      var instance = createWithInterpolation({ prefix: '\\s.*', suffix: '\\d.+' });
      expect(instance.t('Welcome \\s.*name\\d.+', {
        name: 'Robert'
      })).toBe('Welcome Robert');
    });

    it('throws an error when either prefix or suffix equals to pluralization delimiter', () => {
      expect(() => { createWithInterpolation({ prefix: '||||', suffix: '}}' }); }).toThrowError(RangeError);
      expect(() => { createWithInterpolation({ prefix: '{{', suffix: '||||' }); }).toThrowError(RangeError);
    });
  });

  it('returns the translation even if it is an empty string', () => {
    expect(polyglot.t('empty_string')).toBe('');
  });

  it('returns the default value even if it is an empty string', () => {
    expect(polyglot.t('bogus_key', { _: '' })).toBe('');
  });

  it('handles dollar signs in the substitution value', () => {
    expect(polyglot.t('hi_name_welcome_to_place', {
      name: '$abc $0',
      place: '$1 $&'
    })).toBe('Hi, $abc $0, welcome to $1 $&!');
  });

  it('supports nested phrase objects', () => {
    var nestedPhrases = {
      nav: {
        presentations: 'Presentations',
        hi_user: 'Hi, %{user}.',
        cta: {
          join_now: 'Join now!'
        }
      },
      'header.sign_in': 'Sign In'
    };
    var instance = new Polyglot({ phrases: nestedPhrases });
    expect(instance.t('nav.presentations')).toBe('Presentations');
    expect(instance.t('nav.hi_user', { user: 'Raph' })).toBe('Hi, Raph.');
    expect(instance.t('nav.cta.join_now')).toBe('Join now!');
    expect(instance.t('header.sign_in')).toBe('Sign In');
  });

  describe('onMissingKey', () => {
    it('calls the function when a key is missing', () => {
      var expectedKey = 'some key';
      var expectedOptions = {};
      var expectedLocale = 'oz';
      var returnValue = {};
      var onMissingKey = function (key, options, locale) {
        expect(key).toBe(expectedKey);
        expect(options).toBe(expectedOptions);
        expect(locale).toBe(expectedLocale);
        return returnValue;
      };
      var instance = new Polyglot({ onMissingKey: onMissingKey, locale: expectedLocale });
      var result = instance.t(expectedKey, expectedOptions);
      expect(result).toBe(returnValue);
    });

    it('overrides allowMissing', (done) => {
      var missingKey = 'missing key';
      var onMissingKey = function (key) {
        expect(key).toBe(missingKey);
        done();
      };
      var instance = new Polyglot({ onMissingKey: onMissingKey, allowMissing: true });
      instance.t(missingKey);
    });
  });
});

describe('pluralize', () => {
  var phrases = {
    count_name: '%{smart_count} Name |||| %{smart_count} Names'
  };

  var polyglot;
  beforeEach(() => {
    polyglot = new Polyglot({ phrases: phrases, locale: 'en' });
  });

  it('supports pluralization with an integer', () => {
    expect(polyglot.t('count_name', { smart_count: 0 })).toBe('0 Names');
    expect(polyglot.t('count_name', { smart_count: 1 })).toBe('1 Name');
    expect(polyglot.t('count_name', { smart_count: 2 })).toBe('2 Names');
    expect(polyglot.t('count_name', { smart_count: 3 })).toBe('3 Names');
  });

  it('accepts a number as a shortcut to pluralize a word', () => {
    expect(polyglot.t('count_name', 0)).toBe('0 Names');
    expect(polyglot.t('count_name', 1)).toBe('1 Name');
    expect(polyglot.t('count_name', 2)).toBe('2 Names');
    expect(polyglot.t('count_name', 3)).toBe('3 Names');
  });

  it('ignores a region subtag when choosing a pluralization rule', () => {
    var instance = new Polyglot({ phrases: phrases, locale: 'fr-FR' });
    // French rule: "0" is singular
    expect(instance.t('count_name', 0)).toBe('0 Name');
  });
});

describe('locale-specific pluralization rules', () => {
  it('pluralizes in Arabic', () => {
    // English would be: "1 vote" / "%{smart_count} votes"
    var whatSomeoneTranslated = [
      'ولا صوت',
      'صوت واحد',
      'صوتان',
      '%{smart_count} أصوات',
      '%{smart_count} صوت',
      '%{smart_count} صوت'
    ];
    var phrases = {
      n_votes: whatSomeoneTranslated.join(' |||| ')
    };

    var polyglot = new Polyglot({ phrases: phrases, locale: 'ar' });

    expect(polyglot.t('n_votes', 0)).toBe('ولا صوت');
    expect(polyglot.t('n_votes', 1)).toBe('صوت واحد');
    expect(polyglot.t('n_votes', 2)).toBe('صوتان');
    expect(polyglot.t('n_votes', 3)).toBe('3 أصوات');
    expect(polyglot.t('n_votes', 11)).toBe('11 صوت');
    expect(polyglot.t('n_votes', 102)).toBe('102 صوت');
  });

  it('pluralizes in Russian', () => {
    // English would be: "1 vote" / "%{smart_count} votes"
    var whatSomeoneTranslated = [
      '%{smart_count} машина',
      '%{smart_count} машины',
      '%{smart_count} машин'
    ];
    var phrases = {
      n_votes: whatSomeoneTranslated.join(' |||| ')
    };

    var polyglotLanguageCode = new Polyglot({ phrases: phrases, locale: 'ru' });

    expect(polyglotLanguageCode.t('n_votes', 1)).toBe('1 машина');
    expect(polyglotLanguageCode.t('n_votes', 11)).toBe('11 машин');
    expect(polyglotLanguageCode.t('n_votes', 101)).toBe('101 машина');
    expect(polyglotLanguageCode.t('n_votes', 112)).toBe('112 машин');
    expect(polyglotLanguageCode.t('n_votes', 932)).toBe('932 машины');
    expect(polyglotLanguageCode.t('n_votes', 324)).toBe('324 машины');
    expect(polyglotLanguageCode.t('n_votes', 12)).toBe('12 машин');
    expect(polyglotLanguageCode.t('n_votes', 13)).toBe('13 машин');
    expect(polyglotLanguageCode.t('n_votes', 14)).toBe('14 машин');
    expect(polyglotLanguageCode.t('n_votes', 15)).toBe('15 машин');

    var polyglotLocaleId = new Polyglot({ phrases: phrases, locale: 'ru-RU' });

    expect(polyglotLocaleId.t('n_votes', 1)).toBe('1 машина');
    expect(polyglotLocaleId.t('n_votes', 11)).toBe('11 машин');
    expect(polyglotLocaleId.t('n_votes', 101)).toBe('101 машина');
    expect(polyglotLocaleId.t('n_votes', 112)).toBe('112 машин');
    expect(polyglotLocaleId.t('n_votes', 932)).toBe('932 машины');
    expect(polyglotLocaleId.t('n_votes', 324)).toBe('324 машины');
    expect(polyglotLocaleId.t('n_votes', 12)).toBe('12 машин');
    expect(polyglotLocaleId.t('n_votes', 13)).toBe('13 машин');
    expect(polyglotLocaleId.t('n_votes', 14)).toBe('14 машин');
    expect(polyglotLocaleId.t('n_votes', 15)).toBe('15 машин');
  });

  it('pluralizes in Croatian (guest) Test', () => {
    // English would be: "1 vote" / "%{smart_count} votes"
    var whatSomeoneTranslated = [
      '%{smart_count} gost',
      '%{smart_count} gosta',
      '%{smart_count} gostiju'
    ];
    var phrases = {
      n_guests: whatSomeoneTranslated.join(' |||| ')
    };

    var polyglotLocale = new Polyglot({ phrases: phrases, locale: 'hr-HR' });

    expect(polyglotLocale.t('n_guests', 1)).toBe('1 gost');
    expect(polyglotLocale.t('n_guests', 11)).toBe('11 gostiju');
    expect(polyglotLocale.t('n_guests', 21)).toBe('21 gost');

    expect(polyglotLocale.t('n_guests', 2)).toBe('2 gosta');
    expect(polyglotLocale.t('n_guests', 3)).toBe('3 gosta');
    expect(polyglotLocale.t('n_guests', 4)).toBe('4 gosta');

    expect(polyglotLocale.t('n_guests', 12)).toBe('12 gostiju');
    expect(polyglotLocale.t('n_guests', 13)).toBe('13 gostiju');
    expect(polyglotLocale.t('n_guests', 14)).toBe('14 gostiju');
    expect(polyglotLocale.t('n_guests', 112)).toBe('112 gostiju');
    expect(polyglotLocale.t('n_guests', 113)).toBe('113 gostiju');
    expect(polyglotLocale.t('n_guests', 114)).toBe('114 gostiju');
  });

  it('pluralizes in Croatian (vote) Test', () => {
    // English would be: "1 vote" / "%{smart_count} votes"
    var whatSomeoneTranslated = [
      '%{smart_count} glas',
      '%{smart_count} glasa',
      '%{smart_count} glasova'
    ];
    var phrases = {
      n_votes: whatSomeoneTranslated.join(' |||| ')
    };

    var polyglotLocale = new Polyglot({ phrases: phrases, locale: 'hr-HR' });

    [1, 21, 31, 101].forEach((c) => {
      expect(polyglotLocale.t('n_votes', c)).toBe(c + ' glas');
    });
    [2, 3, 4, 22, 23, 24, 32, 33, 34].forEach((c) => {
      expect(polyglotLocale.t('n_votes', c)).toBe(c + ' glasa');
    });
    [0, 5, 6, 11, 12, 13, 14, 15, 16, 17, 25, 26, 35, 36, 112, 113, 114].forEach((c) => {
      expect(polyglotLocale.t('n_votes', c)).toBe(c + ' glasova');
    });

    var polyglotLanguageCode = new Polyglot({ phrases: phrases, locale: 'hr' });

    [1, 21, 31, 101].forEach((c) => {
      expect(polyglotLanguageCode.t('n_votes', c)).toBe(c + ' glas');
    });
    [2, 3, 4, 22, 23, 24, 32, 33, 34].forEach((c) => {
      expect(polyglotLanguageCode.t('n_votes', c)).toBe(c + ' glasa');
    });
    [0, 5, 6, 11, 12, 13, 14, 15, 16, 17, 25, 26, 35, 36, 112, 113, 114].forEach((c) => {
      expect(polyglotLanguageCode.t('n_votes', c)).toBe(c + ' glasova');
    });
  });

  it('pluralizes in Serbian (Latin & Cyrillic)', () => {
    // English would be: "1 vote" / "%{smart_count} votes"
    var whatSomeoneTranslated = [
      '%{smart_count} miš',
      '%{smart_count} miša',
      '%{smart_count} miševa'
    ];
    var phrases = {
      n_votes: whatSomeoneTranslated.join(' |||| ')
    };

    var polyglotLatin = new Polyglot({ phrases: phrases, locale: 'srl-RS' });

    expect(polyglotLatin.t('n_votes', 1)).toBe('1 miš');
    expect(polyglotLatin.t('n_votes', 11)).toBe('11 miševa');
    expect(polyglotLatin.t('n_votes', 101)).toBe('101 miš');
    expect(polyglotLatin.t('n_votes', 932)).toBe('932 miša');
    expect(polyglotLatin.t('n_votes', 324)).toBe('324 miša');
    expect(polyglotLatin.t('n_votes', 12)).toBe('12 miševa');
    expect(polyglotLatin.t('n_votes', 13)).toBe('13 miševa');
    expect(polyglotLatin.t('n_votes', 14)).toBe('14 miševa');
    expect(polyglotLatin.t('n_votes', 15)).toBe('15 miševa');
    expect(polyglotLatin.t('n_votes', 0)).toBe('0 miševa');

    var polyglotCyrillic = new Polyglot({ phrases: phrases, locale: 'sr-RS' });

    expect(polyglotCyrillic.t('n_votes', 1)).toBe('1 miš');
    expect(polyglotCyrillic.t('n_votes', 11)).toBe('11 miševa');
    expect(polyglotCyrillic.t('n_votes', 101)).toBe('101 miš');
    expect(polyglotCyrillic.t('n_votes', 932)).toBe('932 miša');
    expect(polyglotCyrillic.t('n_votes', 324)).toBe('324 miša');
    expect(polyglotCyrillic.t('n_votes', 12)).toBe('12 miševa');
    expect(polyglotCyrillic.t('n_votes', 13)).toBe('13 miševa');
    expect(polyglotCyrillic.t('n_votes', 14)).toBe('14 miševa');
    expect(polyglotCyrillic.t('n_votes', 15)).toBe('15 miševa');
    expect(polyglotCyrillic.t('n_votes', 0)).toBe('0 miševa');
  });

  it('pluralizes in Bosnian (Latin & Cyrillic)', () => {
    // English would be: "1 vote" / "%{smart_count} votes"
    var whatSomeoneTranslated = [
      '%{smart_count} članak',
      '%{smart_count} članka',
      '%{smart_count} članaka'
    ];
    var phrases = {
      n_votes: whatSomeoneTranslated.join(' |||| ')
    };

    var polyglotLatin = new Polyglot({ phrases: phrases, locale: 'bs-Latn-BA' });

    expect(polyglotLatin.t('n_votes', 1)).toBe('1 članak');
    expect(polyglotLatin.t('n_votes', 11)).toBe('11 članaka');
    expect(polyglotLatin.t('n_votes', 101)).toBe('101 članak');
    expect(polyglotLatin.t('n_votes', 932)).toBe('932 članka');
    expect(polyglotLatin.t('n_votes', 324)).toBe('324 članka');
    expect(polyglotLatin.t('n_votes', 12)).toBe('12 članaka');
    expect(polyglotLatin.t('n_votes', 13)).toBe('13 članaka');
    expect(polyglotLatin.t('n_votes', 14)).toBe('14 članaka');
    expect(polyglotLatin.t('n_votes', 15)).toBe('15 članaka');
    expect(polyglotLatin.t('n_votes', 112)).toBe('112 članaka');
    expect(polyglotLatin.t('n_votes', 113)).toBe('113 članaka');
    expect(polyglotLatin.t('n_votes', 114)).toBe('114 članaka');
    expect(polyglotLatin.t('n_votes', 115)).toBe('115 članaka');
    expect(polyglotLatin.t('n_votes', 0)).toBe('0 članaka');

    var polyglotCyrillic = new Polyglot({ phrases: phrases, locale: 'bs-Cyrl-BA' });

    expect(polyglotCyrillic.t('n_votes', 1)).toBe('1 članak');
    expect(polyglotCyrillic.t('n_votes', 11)).toBe('11 članaka');
    expect(polyglotCyrillic.t('n_votes', 101)).toBe('101 članak');
    expect(polyglotCyrillic.t('n_votes', 932)).toBe('932 članka');
    expect(polyglotCyrillic.t('n_votes', 324)).toBe('324 članka');
    expect(polyglotCyrillic.t('n_votes', 12)).toBe('12 članaka');
    expect(polyglotCyrillic.t('n_votes', 13)).toBe('13 članaka');
    expect(polyglotCyrillic.t('n_votes', 14)).toBe('14 članaka');
    expect(polyglotCyrillic.t('n_votes', 15)).toBe('15 članaka');
    expect(polyglotCyrillic.t('n_votes', 112)).toBe('112 članaka');
    expect(polyglotCyrillic.t('n_votes', 113)).toBe('113 članaka');
    expect(polyglotCyrillic.t('n_votes', 114)).toBe('114 članaka');
    expect(polyglotCyrillic.t('n_votes', 115)).toBe('115 članaka');
    expect(polyglotCyrillic.t('n_votes', 0)).toBe('0 članaka');
  });

  it('pluralizes in Czech', () => {
    // English would be: "1 vote" / "%{smart_count} votes"
    var whatSomeoneTranslated = [
      '%{smart_count} komentář',
      '%{smart_count} komentáře',
      '%{smart_count} komentářů'
    ];
    var phrases = {
      n_votes: whatSomeoneTranslated.join(' |||| ')
    };

    var polyglot = new Polyglot({ phrases: phrases, locale: 'cs-CZ' });

    expect(polyglot.t('n_votes', 1)).toBe('1 komentář');
    expect(polyglot.t('n_votes', 2)).toBe('2 komentáře');
    expect(polyglot.t('n_votes', 3)).toBe('3 komentáře');
    expect(polyglot.t('n_votes', 4)).toBe('4 komentáře');
    expect(polyglot.t('n_votes', 0)).toBe('0 komentářů');
    expect(polyglot.t('n_votes', 11)).toBe('11 komentářů');
    expect(polyglot.t('n_votes', 12)).toBe('12 komentářů');
    expect(polyglot.t('n_votes', 16)).toBe('16 komentářů');
  });

  it('pluralizes in Slovenian', () => {
    // English would be: "1 vote" / "%{smart_count} votes"
    var whatSomeoneTranslated = [
      '%{smart_count} komentar',
      '%{smart_count} komentarja',
      '%{smart_count} komentarji',
      '%{smart_count} komentarjev'
    ];
    var phrases = {
      n_votes: whatSomeoneTranslated.join(' |||| ')
    };

    var polyglot = new Polyglot({ phrases: phrases, locale: 'sl-SL' });

    [1, 12301, 101, 1001, 201, 301].forEach((c) => {
      expect(polyglot.t('n_votes', c)).toBe(c + ' komentar');
    });

    [2, 102, 202, 302].forEach((c) => {
      expect(polyglot.t('n_votes', c)).toBe(c + ' komentarja');
    });

    [0, 11, 12, 13, 14, 52, 53].forEach((c) => {
      expect(polyglot.t('n_votes', c)).toBe(c + ' komentarjev');
    });
  });

  it('pluralizes in Turkish', () => {
    var whatSomeoneTranslated = [
      'Sepetinizde %{smart_count} X var. Bunu almak istiyor musunuz?',
      'Sepetinizde %{smart_count} X var. Bunları almak istiyor musunuz?'
    ];
    var phrases = {
      n_x_cart: whatSomeoneTranslated.join(' |||| ')
    };

    var polyglot = new Polyglot({ phrases: phrases, locale: 'tr' });

    expect(polyglot.t('n_x_cart', 1)).toBe('Sepetinizde 1 X var. Bunu almak istiyor musunuz?');
    expect(polyglot.t('n_x_cart', 2)).toBe('Sepetinizde 2 X var. Bunları almak istiyor musunuz?');
  });

  it('pluralizes in Lithuanian', () => {
    var whatSomeoneTranslated = [
      '%{smart_count} balsas',
      '%{smart_count} balsai',
      '%{smart_count} balsų'
    ];
    var phrases = {
      n_votes: whatSomeoneTranslated.join(' |||| ')
    };
    var polyglot = new Polyglot({ phrases: phrases, locale: 'lt' });

    expect(polyglot.t('n_votes', 0)).toBe('0 balsų');
    expect(polyglot.t('n_votes', 1)).toBe('1 balsas');
    expect(polyglot.t('n_votes', 2)).toBe('2 balsai');
    expect(polyglot.t('n_votes', 9)).toBe('9 balsai');
    expect(polyglot.t('n_votes', 10)).toBe('10 balsų');
    expect(polyglot.t('n_votes', 11)).toBe('11 balsų');
    expect(polyglot.t('n_votes', 12)).toBe('12 balsų');
    expect(polyglot.t('n_votes', 90)).toBe('90 balsų');
    expect(polyglot.t('n_votes', 91)).toBe('91 balsas');
    expect(polyglot.t('n_votes', 92)).toBe('92 balsai');
    expect(polyglot.t('n_votes', 102)).toBe('102 balsai');
  });
});

describe('custom pluralRules', () => {
  var customPluralRules = {
    pluralTypes: {
      germanLike: function (n) {
        // is 1
        if (n === 1) {
          return 0;
        }
        // everything else
        return 1;
      },
      frenchLike: function (n) {
        // is 0 or 1
        if (n <= 1) {
          return 0;
        }
        // everything else
        return 1;
      }
    },
    pluralTypeToLanguages: {
      germanLike: ['x1'],
      frenchLike: ['x2']
    }
  };

  var testPhrases = {
    test_phrase: '%{smart_count} form zero |||| %{smart_count} form one'
  };

  it('pluralizes in x1', () => {
    var polyglot = new Polyglot({
      phrases: testPhrases,
      locale: 'x1',
      pluralRules: customPluralRules
    });

    expect(polyglot.t('test_phrase', 0)).toBe('0 form one');
    expect(polyglot.t('test_phrase', 1)).toBe('1 form zero');
    expect(polyglot.t('test_phrase', 2)).toBe('2 form one');
  });

  it('pluralizes in x2', () => {
    var polyglot = new Polyglot({
      phrases: testPhrases,
      locale: 'x2',
      pluralRules: customPluralRules
    });

    expect(polyglot.t('test_phrase', 0)).toBe('0 form zero');
    expect(polyglot.t('test_phrase', 1)).toBe('1 form zero');
    expect(polyglot.t('test_phrase', 2)).toBe('2 form one');
  });
});

describe('locale', () => {
  var polyglot;
  beforeEach(() => {
    polyglot = new Polyglot();
  });

  it('defaults to "en"', () => {
    expect(polyglot.locale()).toBe('en');
  });

  it('gets and sets locale', () => {
    polyglot.locale('es');
    expect(polyglot.locale()).toBe('es');

    polyglot.locale('fr');
    expect(polyglot.locale()).toBe('fr');
  });
});

describe('extend', () => {
  var polyglot;
  beforeEach(() => {
    polyglot = new Polyglot();
  });

  it('supports multiple extends, overriding old keys', () => {
    polyglot.extend({ aKey: 'First time' });
    polyglot.extend({ aKey: 'Second time' });
    expect(polyglot.t('aKey')).toBe('Second time');
  });

  it('does not forget old keys', () => {
    polyglot.extend({ firstKey: 'Numba one', secondKey: 'Numba two' });
    polyglot.extend({ secondKey: 'Numero dos' });
    expect(polyglot.t('firstKey')).toBe('Numba one');
  });

  it('supports optional `prefix` argument', () => {
    polyglot.extend({ click: 'Click', hover: 'Hover' }, 'sidebar');
    expect(polyglot.phrases['sidebar.click']).toBe('Click');
    expect(polyglot.phrases['sidebar.hover']).toBe('Hover');
    expect(polyglot.phrases).not.toHaveProperty('click');
  });

  it('supports nested object', () => {
    polyglot.extend({
      sidebar: {
        click: 'Click',
        hover: 'Hover'
      },
      nav: {
        header: {
          log_in: 'Log In'
        }
      }
    });
    expect(polyglot.phrases['sidebar.click']).toBe('Click');
    expect(polyglot.phrases['sidebar.hover']).toBe('Hover');
    expect(polyglot.phrases['nav.header.log_in']).toBe('Log In');
    expect(polyglot.phrases).not.toHaveProperty('click');
    expect(polyglot.phrases).not.toHaveProperty('header.log_in');
    expect(polyglot.phrases).not.toHaveProperty('log_in');
  });
});

describe('clear', () => {
  var polyglot;
  beforeEach(() => {
    polyglot = new Polyglot();
  });

  it('wipes out old phrases', () => {
    polyglot.extend({ hiFriend: 'Hi, Friend.' });
    polyglot.clear();
    expect(polyglot.t('hiFriend')).toBe('hiFriend');
  });
});

describe('replace', () => {
  var polyglot;
  beforeEach(() => {
    polyglot = new Polyglot();
  });

  it('wipes out old phrases and replace with new phrases', () => {
    polyglot.extend({ hiFriend: 'Hi, Friend.', byeFriend: 'Bye, Friend.' });
    polyglot.replace({ hiFriend: 'Hi, Friend.' });
    expect(polyglot.t('hiFriend')).toBe('Hi, Friend.');
    expect(polyglot.t('byeFriend')).toBe('byeFriend');
  });
});

describe('unset', () => {
  var polyglot;
  beforeEach(() => {
    polyglot = new Polyglot();
  });

  it('unsets a key based on a string', () => {
    polyglot.extend({ test_key: 'test_value' });
    expect(polyglot.has('test_key')).toBe(true);

    polyglot.unset('test_key');
    expect(polyglot.has('test_key')).toBe(false);
  });

  it('unsets a key based on an object hash', () => {
    polyglot.extend({ test_key: 'test_value', foo: 'bar' });
    expect(polyglot.has('test_key')).toBe(true);
    expect(polyglot.has('foo')).toBe(true);

    polyglot.unset({ test_key: 'test_value', foo: 'bar' });
    expect(polyglot.has('test_key')).toBe(false);
    expect(polyglot.has('foo')).toBe(false);
  });

  it('unsets nested objects using recursive prefix call', () => {
    polyglot.extend({ foo: { bar: 'foobar' } });
    expect(polyglot.has('foo.bar')).toBe(true);

    polyglot.unset({ foo: { bar: 'foobar' } });
    expect(polyglot.has('foo.bar')).toBe(false);
  });
});

describe('transformPhrase', () => {
  var simple = '%{name} is %{attribute}';
  var english = '%{smart_count} Name |||| %{smart_count} Names';
  var arabic = [
    'ولا صوت',
    'صوت واحد',
    'صوتان',
    '%{smart_count} أصوات',
    '%{smart_count} صوت',
    '%{smart_count} صوت'
  ].join(' |||| ');

  it('does simple interpolation', () => {
    expect(Polyglot.transformPhrase(simple, { name: 'Polyglot', attribute: 'awesome' })).toBe('Polyglot is awesome');
  });

  it('removes missing keys', () => {
    expect(Polyglot.transformPhrase(simple, { name: 'Polyglot' })).toBe('Polyglot is %{attribute}');
  });

  it('selects the correct plural form based on smart_count', () => {
    expect(Polyglot.transformPhrase(english, { smart_count: 0 }, 'en')).toBe('0 Names');
    expect(Polyglot.transformPhrase(english, { smart_count: 1 }, 'en')).toBe('1 Name');
    expect(Polyglot.transformPhrase(english, { smart_count: 2 }, 'en')).toBe('2 Names');
    expect(Polyglot.transformPhrase(english, { smart_count: 3 }, 'en')).toBe('3 Names');
  });

  it('selects the correct locale', () => {
    // French rule: "0" is singular
    expect(Polyglot.transformPhrase(english, { smart_count: 0 }, 'fr')).toBe('0 Name');
    expect(Polyglot.transformPhrase(english, { smart_count: 1 }, 'fr')).toBe('1 Name');
    expect(Polyglot.transformPhrase(english, { smart_count: 1.5 }, 'fr')).toBe('1.5 Name');
    // French rule: plural starts at 2 included
    expect(Polyglot.transformPhrase(english, { smart_count: 2 }, 'fr')).toBe('2 Names');
    expect(Polyglot.transformPhrase(english, { smart_count: 3 }, 'fr')).toBe('3 Names');

    // Arabic has 6 rules
    expect(Polyglot.transformPhrase(arabic, 0, 'ar')).toBe('ولا صوت');
    expect(Polyglot.transformPhrase(arabic, 1, 'ar')).toBe('صوت واحد');
    expect(Polyglot.transformPhrase(arabic, 2, 'ar')).toBe('صوتان');
    expect(Polyglot.transformPhrase(arabic, 3, 'ar')).toBe('3 أصوات');
    expect(Polyglot.transformPhrase(arabic, 11, 'ar')).toBe('11 صوت');
    expect(Polyglot.transformPhrase(arabic, 102, 'ar')).toBe('102 صوت');
  });

  it('defaults to `en`', () => {
    // French rule: "0" is singular
    expect(Polyglot.transformPhrase(english, { smart_count: 0 })).toBe('0 Names');
  });

  it('ignores a region subtag when choosing a pluralization rule', () => {
    // French rule: "0" is singular
    expect(Polyglot.transformPhrase(english, { smart_count: 0 }, 'fr-FR')).toBe('0 Name');
  });

  it('works without arguments', () => {
    expect(Polyglot.transformPhrase(english)).toBe(english);
  });

  it('respects a number as shortcut for smart_count', () => {
    expect(Polyglot.transformPhrase(english, 0, 'en')).toBe('0 Names');
    expect(Polyglot.transformPhrase(english, 1, 'en')).toBe('1 Name');
    expect(Polyglot.transformPhrase(english, 5, 'en')).toBe('5 Names');
  });

  it('throws without sane phrase string', () => {
    expect(() => { Polyglot.transformPhrase(); }).toThrowError(TypeError);
    expect(() => { Polyglot.transformPhrase(null); }).toThrowError(TypeError);
    expect(() => { Polyglot.transformPhrase(32); }).toThrowError(TypeError);
    expect(() => { Polyglot.transformPhrase({}); }).toThrowError(TypeError);
  });
});
