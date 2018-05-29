# Elm assets loader [![Version](https://img.shields.io/npm/v/elm-assets-loader.svg)](https://www.npmjs.com/package/elm-webpack-loader) [![Travis build Status](https://travis-ci.org/NoRedInk/elm-assets-loader.svg?branch=master)](http://travis-ci.org/NoRedInk/elm-assets-loader)

[webpack](http://webpack.github.io/docs/) loader for webpackifying asset references
in [Elm](http://elm-lang.org/).

## Installation

```sh
$ npm install --save elm-assets-loader
```


## Usage

[Documentation: Using loaders](http://webpack.github.io/docs/using-loaders.html)

elm-assets-loader is intended to be chained after [elm-webpack-loader](https://github.com/rtfeldman/elm-webpack-loader),
and with a loader to load static assets like [file-loader](https://github.com/webpack/file-loader)
or [url-loader](https://github.com/webpack/url-loader). [elm-asset-path](https://github.com/NoRedInk/elm-asset-path)
is a companion Elm package that provides types and functions for working with asset paths.


Suppose we have a union type for tagging asset paths:

```elm
module My.Assets exposing (AssetPath(..))

type AssetPath
    = AssetPath String

star =
    AssetPath "star.png"
```

Tell elm-assets-loader to look for strings tagged with `AssetPath`:

```js
    rules: [
      {
        test: /\.elm$/,
        exclude: [/elm-stuff/, /node_modules/],
        use: [
          {
            loader: 'elm-assets-loader',
            options: {
              module: 'My.Assets',
              tagger: 'AssetPath'
            }
          },
          'elm-webpack-loader'
        ]
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loader: 'file-loader',
        options: {
          name: '[name]-[hash].[ext]'
        }
      }
    ]
```

Then at runtime, the value of `My.Assets.star` will be something like
`AssetPath "star-038a1253d7a9e4682deb72cd68c3a328.png"`.


To actually use this string value, define a helper like so:

```elm
-- say, in My.Assets

path : AssetPath -> String
path (AssetPath str) =
    str
```

Usage example:

```elm
viewStar : Html Msg
viewStar =
    img [ src <| My.Assets.path <| My.Assets.star ] []
```

[elm-asset-path](https://github.com/NoRedInk/elm-asset-path) includes a reference
implementation of this `AssetPath` type with support for resolving to a URL on a CDN.


## Options


### tagger (required)

- Example: `"AssetPath"`
- The "tag" part of a tagged union of shape `<tagger> String` that's used to tag asset paths in your code.

### module (required)

- Example: `"My.Assets"`
- Module in which the tagged union is defined.

### package (optional)

- Default: `"user/project"`
- Example: `"NoRedInk/myapp"`
- Look for the tagger inside this package.
- If the module you specified above is provided by a 3rd party package, then specify the
  name of that package.
- If the module you specified above is defined in your main application code, then specify the owner/repo
  portion of the "repository" property of your `elm-package.json`.
  - ex.`"repository": "https://github.com/user/project.git"` -> package should be `"user/project"`
  - ex.`"repository": "https://github.com/NoRedInk/myapp.git"` -> package should be `"NoRedInk/myapp"`

### dynamicRequires (optional)

- Default: `"warn"`
- Possible values: `"error"` | `"warn"` | `"ok"`
- What to do with dynamically constructed asset paths.
  - "error" - stop processing the file
  - "warn" - emit a warning
  - "ok" - this is expected; say nothing about it

  [Dynamic requires][dynamic-requires] is *not* supported. This option simply
  controls whether or not to raise an error or skip over expressions like:

  ```elm
  example iconName =
      AssetPath ("icon-" ++ iconName ++ ".png")
  ```

  [dynamic-requires]: https://webpack.github.io/docs/context.html#dynamic-requires

### localPath (optional)

- Function to transform tagged strings to a path that can be resolved by webpack.
  For example, you may want to tag URL paths, which may not be resolvable to a
  filesystem path, so that your code works without being webpacked.

  ```elm
  star = AssetPath "/public/images/star.png"

  img [ src (toUrl star) ] []
  ```

  webpack config (for webpack 2):

  ```js
  module.exports = {
    ...
    module: {
      rules: [
        {
          test: /\.elm$/,
          use: [
            {
              loader: 'elm-assets-loader',
              options: {
                localPath: function(url) {
                  // transform `url` to a local path that resolves to a file
                  return url.replace(/^\/public\//, "");
                }
              }
            },
            'elm-webpack-loader?cwd=' + fixturesPath + '&pathToMake=' + elmMakePath
          ]
        },
        {
          test: /\.svg$/,
          use: {
            loader: 'file-loader',
            options: {
              publicPath: function(path) {
                // transform `path` to a URL that the web server can understand and serve
                return "/public/" + url;
              }
            }
          }
        }
      }
    }
  }
  ```

### Note

Don't set noParse on .elm files. Otherwise, `require`s won't be processed.

## Under the hood

Let's walk through what happens to the example above when processed by webpack.

This Elm code:

```elm
AssetPath "star.png"
```

will be compiled to JavaScript by elm-webpack-loader:

```js
_user$project$My_Assets$AssetPath("star.png")
```

elm-assets-loader turns this into:

```js
_user$project$My_Assets$AssetPath(require("star.png"))
```

webpack parses this `require` call, determines it to be a file-loader module, resulting in:

```js
_user$project$My_Assets$AssetPath(__webpack_require__(30))
```

The module loaded by `__webpack_require__(30)` will look like:

```js
30:
function(module, exports) {
   module.exports = "star-038a1253d7a9e4682deb72cd68c3a328.png";
}
```

Which means, effectively, the JavaScript code we saw originally has been rewritten as:

```js
_user$project$My_Assets$AssetPath("star-038a1253d7a9e4682deb72cd68c3a328.png")
```


### Supported Versions
See .travis.yml to see supported combinations of the Elm Compiler & Webpack.
