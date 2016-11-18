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
or [url-loader](https://github.com/webpack/url-loader).

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
    loaders: [
      {
        test: /\.elm$/,
        exclude: [/elm-stuff/, /node_modules/],
        loaders: [
          'elm-assets?module=My.Assets&tagger=AssetPath',
          'elm-webpack'
        ]
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loader: 'file',
        query: {
            name: '[name]-[hash].[ext]'
        }
      }
    ]
```

At runtime, the value of `My.Assets.star` will be something like
`AssetPath "star-038a1253d7a9e4682deb72cd68c3a328.png"`.


## Options


### tagger (required)

- Example: "AssetPath"
- The "tag" part of a tagged union of shape `<tagger> String` that's used to tag asset paths in your code

### module (required)

- Example: "My.Assets"
- Module in which the tagged union is defined

### package (optional)

- Example: "NoRedInk/myapp"
- Look for the tagger inside this package. Not needed if it's defined in your main application code.

### localPath (optional)

- Function to transform tagged strings to a path that can be resolved by webpack.
  For example, you may want to tag URL paths, which may not be resolvable to a
  filesystem path, so that your code works without being webpacked.

  ```elm
  star = AssetPath "/public/images/star.png"

  img [ src (toUrl star) ] []
  ```

  webpack config:

  ```js
  module.exports = {
    ...
    elmAssetsLoader: {
      localPath: function(url) {
        // transform `url` to a local path that resolves to a file
        return url.replace(/^\/public\//, "")
      }
    },
    fileLoader: {
      publicPath: function(path) {
        // transform `path` to a URL that the web server can understand and serve
        return "/public/" + url;
      }
    }
  }
  ```

### config (optional)

- Default: "elmAssetsLoader"
- Specify the top-level webpack options key under which elm-assets-loader specific options live.

### Note

Don't set noParse on .elm files. Otherwise, `require`s won't be processed.

## Under the hood

Let's walk through what happens to the usage example above when processed by webpack.

This Elm code:

```elm
AssetPath "star.png"
```

will be compiled to JS by elm-webpack-loader:

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
   module.exports = "/assets/star-038a1253d7a9e4682deb72cd68c3a328.png";
}
```
