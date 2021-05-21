# TerraGlot

A tiny i18n helper library

This is a modern fork of [airbnb/polyglot.js](https://github.com/airbnb/polyglot.js) – Polyglot.js is a tiny I18n helper library written in JavaScript, made to work both in the browser and in CommonJS environments (Node). It provides a simple solution for interpolation and pluralization, based off of Airbnb’s experience adding I18n functionality to its Backbone.js and Node apps.

I18n is incredibly important for us at [Airbnb](https://www.airbnb.com/), as we have listings in 192 countries, and we translate our site into 30-odd different languages.
We’re also [hiring talented engineers](https://www.airbnb.com/jobs/departments/engineering) to help us scale up to meet the challenges of building a global marketplace.

<!-- View the [documentation on Github](https://github.com/airbnb/polyglot.js). -->

<!-- View the [annotated source](https://airbnb.io/polyglot.js/polyglot.html). -->

TerraGlot is agnostic to your translation backend. It doesn’t perform any translation; it simply gives you a way to manage translated phrases from your client- or server-side JavaScript application.

## Installation

install with [npm](https://npmjs.org):

    $ npm install terraglot

### Running the tests

Clone the repo, run `npm install`, and `npm test`.

## Usage

### Instantiation

First, create an instance of the `Polyglot` class, which you will use for translation.

```js
var terraglot = new TerraGlot();
```

TerraGlot is class-based so you can maintain different sets of phrases at the same time, possibly in different locales. This is very useful for example when serving requests with [Express](http://expressjs.com), because each request may have a different locale, and you don’t want concurrent requests to clobber each other’s phrases.

See [Options Overview](#options-overview) for information about the options object you can choose to pass to `new TerraGlot`.

### Translation

Tell TerraGlot what to say by simply giving it a phrases object,
where the key is the canonical name of the phrase and the value is
the already-translated string.

```js
terraglot.extend({
  "hello": "Hello"
});

terraglot.t("hello");
=> "Hello"
```

You can also pass a mapping at instantiation, using the key `phrases`:

```js
var terraglot = new TerraGlot({ phrases: { hello: 'Hello' } });
```

TerraGlot doesn’t do the translation for you. It’s up to you to give it
the proper phrases for the user’s locale.

A common pattern is to gather a hash of phrases in your backend, and output
them in a `<script>` tag at the bottom of the document. For example, in Rails:

`app/controllers/home_controller.rb`

```ruby
def index
  @phrases = {
    "home.login" => I18n.t("home.login"),
    "home.signup" => I18n.t("home.signup"),
    ...
  }
end
```

`app/views/home/index.html.erb`

```html
<script>
  var terraglot = new TerraGlot({phrases: <%= raw @phrases.to_json %>});
</script>
```

And now you can utilize i.e. `terraglot.t("home.login")` in your JavaScript application
or Handlebars templates.

### Interpolation

`terraglot.t()` also provides interpolation. Pass an object with key-value pairs of
interpolation arguments as the second parameter.

```js
terraglot.extend({
  "hello_name": "Hola, %{name}."
});

terraglot.t("hello_name", {name: "DeNiro"});
=> "Hola, DeNiro."
```

TerraGlot also supports nested phrase objects.

```js
terraglot.extend({
  "nav": {
    "hello": "Hello",
    "hello_name": "Hello, %{name}",
    "sidebar": {
      "welcome": "Welcome"
    }
  }
});

terraglot.t("nav.sidebar.welcome");
=> "Welcome"
```

The substitution variable syntax is customizable.

```js
var terraglot = new TerraGlot({
  phrases: {
    "hello_name": "Hola {{name}}"
  },
  interpolation: {prefix: '{{', suffix: '}}'}
});

terraglot.t("hello_name", {name: "DeNiro"});
=> "Hola, DeNiro."
```

### Pluralization

For pluralization to work properly, you need to tell TerraGlot what the current locale is. You can use `terraglot.locale("fr")` to set the locale to, for example, French. This method is also a getter:

```js
terraglot.locale()
=> "fr"
```

You can also pass this in during instantiation.

```js
var terraglot = new TerraGlot({ locale: 'fr' });
```

Currently, the _only_ thing that TerraGlot uses this locale setting for is pluralization.

TerraGlot provides a very basic pattern for providing pluralization based on a single string that contains all plural forms for a given phrase. Because various languages have different nominal forms for zero, one, and multiple, and because the noun can be before or after the count, we have to be overly explicit about the possible phrases.

To get a pluralized phrase, still use `terraglot.t()` but use a specially-formatted phrase string that separates the plural forms by the delimiter `||||`, or four vertical pipe characters.

For pluralizing "car" in English, TerraGlot assumes you have a phrase of the form:

```js
terraglot.extend({
  num_cars: '%{smart_count} car |||| %{smart_count} cars'
});
```

Please keep in mind that `smart_count` is required. No other option name is taken into account to transform pluralization strings.

In English (and German, Spanish, Italian, and a few others) there are only two plural forms: singular and not-singular.

Some languages get a bit more complicated. In Czech, there are three separate forms: 1, 2 through 4, and 5 and up. Russian is even more involved.

```js
var terraglot = new TerraGlot({ locale: 'cs' }); // Czech
terraglot.extend({
  num_foxes: 'Mám %{smart_count} lišku |||| Mám %{smart_count} lišky |||| Mám %{smart_count} lišek'
});
```

`terraglot.t()` will choose the appropriate phrase based on the provided `smart_count` option, whose value is a number.

```js
terraglot.t("num_cars", {smart_count: 0});
=> "0 cars"

terraglot.t("num_cars", {smart_count: 1});
=> "1 car"

terraglot.t("num_cars", {smart_count: 2});
=> "2 cars"
```

As a shortcut, you can also pass a number to the second parameter:

```js
terraglot.t("num_cars", 2);
=> "2 cars"
```

#### Custom Pluralization Rules

TerraGlot provides some default pluralization rules for some locales. You can specify a different set of rules through the `pluralRules` constructor param.

```js
var terraglot = new TerraGlot({
  pluralRules: {
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
      germanLike: ['de', 'en', 'xh', 'zu'],
      frenchLike: ['fr', 'hy']
    }
  }
});
```

This can be useful to support locales that TerraGlot does not support by default or to change the rule definitions.

## Public Instance Methods

### TerraGlot.prototype.t(key, interpolationOptions)

The most-used method. Provide a key, and `t()` will return the phrase.

```js
terraglot.t("hello");
=> "Hello"
```

The phrase value is provided first by a call to `terraglot.extend()` or `terraglot.replace()`.

Pass in an object as the second argument to perform interpolation.

```js
terraglot.t("hello_name", {name: "Spike"});
=> "Hello, Spike"
```

Pass a number as the second argument as a shortcut to `smart_count`:

```js
// same as: terraglot.t("car", {smart_count: 2});
terraglot.t("car", 2);
=> "2 cars"
```

If you like, you can provide a default value in case the phrase is missing.
Use the special option key "\_" to specify a default.

```js
terraglot.t("i_like_to_write_in_language", {
  _: "I like to write in %{language}.",
  language: "JavaScript"
});
=> "I like to write in JavaScript."
```

### TerraGlot.prototype.extend(phrases)

Use `extend` to tell TerraGlot how to translate a given key.

```js
terraglot.extend({
  hello: 'Hello',
  hello_name: 'Hello, %{name}'
});
```

The key can be any string. Feel free to call `extend` multiple times; it will override any phrases with the same key, but leave existing phrases untouched.

### TerraGlot.prototype.unset(keyOrObject)

Use `unset` to selectively remove keys from a TerraPlot instance.
`unset` accepts one argument: either a single string key, or an object whose keys are string keys, and whose values are ignored unless they are nested objects (in the same format).

Example:

```js
terraglot.unset('some_key');
terraglot.unset({
  hello: 'Hello',
  hello_name: 'Hello, %{name}',
  foo: {
    bar: 'This phrase’s key is "foo.bar"'
  }
});
```

### TerraGlot.prototype.locale([localeToSet])

Get or set the locale (also can be set using the [constructor option](#options-overview), which is used only for pluralization.
If a truthy value is provided, it will set the locale. Afterwards, it will return it.

### TerraGlot.prototype.clear()

Clears all phrases. Useful for special cases, such as freeing up memory if you have lots of phrases but no longer need to perform any translation. Also used internally by `replace`.

### TerraGlot.prototype.replace(phrases)

Completely replace the existing phrases with a new set of phrases.
Normally, just use `extend` to add more phrases, but under certain circumstances, you may want to make sure no old phrases are lying around.

### TerraGlot.prototype.has(key)

Returns `true` if the key does exist in the provided phrases, otherwise it will return `false`.

## Public Static Methods

### transformPhrase(phrase[, substitutions[, locale]])

Takes a phrase string and transforms it by choosing the correct plural form and interpolating it. This method is used internally by [t](#terraglotprototypetkey-interpolationoptions).
The correct plural form is selected if substitutions.smart_count is set.
You can pass in a number instead of an Object as `substitutions` as a shortcut for `smart_count`.
You should pass in a third argument, the locale, to specify the correct plural type. It defaults to `'en'` which has 2 plural forms.

## Options Overview

`new TerraGlot` accepts a number of options:

- `phrases`: a key/value map of translated phrases. See [Translation](#translation).
- `locale`: a string describing the locale (language and region) of the translation, to apply pluralization rules. see [Pluralization](#pluralization)
- `allowMissing`: a boolean to control whether missing keys in a `t` call are allowed. If `false`, by default, a missing key is returned and a warning is issued.
- `onMissingKey`: if `allowMissing` is `true`, and this option is a function, then it will be called instead of the default functionality. Arguments passed to it are `key`, `options`, and `locale`. The return of this function will be used as a translation fallback when `terraglot.t('missing.key')` is called (hint: return the key).
- `interpolation`: an object to change the substitution syntax for interpolation by setting the `prefix` and `suffix` fields.
- `pluralRules`: an object of `pluralTypes` and `pluralTypeToLanguages` to control pluralization logic.

## [History](CHANGELOG.md)

## Related projects

- [polyglot.js](https://github.com/airbnb/polyglot.js): The roots of this project
- [i18n-extract](https://github.com/oliviertassinari/i18n-extract): Manage localization with static analysis. (E.g. key usage extraction)
