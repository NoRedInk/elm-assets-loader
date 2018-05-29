'use strict';

const loaderUtils = require('loader-utils');
const babel = require('@babel/core');
const {default: generate} = require('@babel/generator');

const DYNAMIC_REQUIRES_OK = Symbol.for("ok");
const DYNAMIC_REQUIRES_WARN = Symbol.for("warn");
const DYNAMIC_REQUIRES_ERROR = Symbol.for("error");
const DYNAMIC_REQUIRES_VALUES = [
  DYNAMIC_REQUIRES_OK,
  DYNAMIC_REQUIRES_WARN,
  DYNAMIC_REQUIRES_ERROR
].map(s => Symbol.keyFor(s));

const loader = function(source, inputSourceMap) {
  this.cacheable && this.cacheable();

  const config = loaderUtils.getOptions(this);
  config.dynamicRequires = config.dynamicRequires || 'warn';

  if(!(config.hasOwnProperty('module') &&
       config.hasOwnProperty('tagger'))) {
    this.emitError("Please configure module and tagger to use this loader.");
  }

  if (!DYNAMIC_REQUIRES_VALUES.includes(config.dynamicRequires)) {
    this.emitError(`Expecting dynamicRequires to be one of
                    ${DYNAMIC_REQUIRES_VALUES.join(' | ')}.
                    You gave me: ${config.dynamicRequires}`);
  }

  const packageName = config['package'] || 'user/project';
  const taggerName = '_' + [
    packageName.replace(/-/g, '_').replace(/\//g, '$'),
    config.module.replace(/\./g, '_'),
    config.tagger
  ].join('$');

  const transformerOptions = {
    taggerName: taggerName,
    dynamicRequires: Symbol.for(config.dynamicRequires),
    localPath: config.localPath
  };

  const webpackRemainingChain = loaderUtils.getRemainingRequest(this).split("!");
  const filename  = webpackRemainingChain[webpackRemainingChain.length - 1];
  const babelOptions = {
    inputSourceMap: inputSourceMap,
    sourceRoot: process.cwd(),
    filename: filename,
    compact: false,
    babelrc: false
  };

  const result = transform(source, this, transformerOptions, babelOptions);

  this.callback(null, result.code, result.map);
};

const transform = function(source, loaderContext, transformerOptions, babelOptions) {
  babelOptions.plugins = [
    assetTransformer(loaderContext, transformerOptions)
  ];

  const result = babel.transform(source, babelOptions);
  const code = result.code;
  const map = result.map;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  return {
    code: code,
    map: map
  };
}

const assetTransformer = function(loaderContext, options) {
  const plugin = function({ types: t }) {
    return {
      visitor: {
        CallExpression: callExpressionVisitor(t, loaderContext, options)
      }
    }
  };

  return plugin;
}

const REPLACED_NODE = Symbol('elmAssetsLoaderReplaced');

const callExpressionVisitor = function(t, loaderContext, options) {
  const visitor = function(path) {
    // avoid infinite recursion
    if (path.node[REPLACED_NODE]) {
      return;
    }

    // calling the tagger we want?

    if (!t.isIdentifier(path.node.callee)) {
      return;
    }

    if (path.node.callee.name !== options.taggerName) {
      return;
    }

    // check for multiple args.
    // though this isn't likely to happen in practice, since multiple
    // argument calls get compiled to something like:
    //
    //     A2(_user$project$MultiArg$Asset, 'elm_logo.svg', 'elm_logo.svg');
    if (path.node.arguments.length > 1) {
      loaderContext.emitError("Tagger that tags multiple strings is currently not supported.");
    }

    // check for zero args.
    // though this isn't likely to happen in practice, since zero
    // argument calls mean:
    //
    //     var _user$project$NoArg$assetPath = 'star.png';
    if (path.node.arguments.length === 0) {
      loaderContext.emitError("Tagger must tag only one string.");
    }

    const argument = path.node.arguments[0];

    // check for non-string-literals
    if (!(t.isLiteral(argument) && typeof argument.value === 'string')) {
      const actualCode = generate(path.node).code;

      if (options.dynamicRequires === DYNAMIC_REQUIRES_ERROR) {
        loaderContext.emitError("Failing hard to make sure all assets are run through webpack. Dynamically constructed asset path like this is not supported:" + actualCode);
      } else if (options.dynamicRequires === DYNAMIC_REQUIRES_WARN) {
        loaderContext.emitWarning("This asset path, which is dynamically constructed, will not be run through webpack: " + actualCode);
      }

      /*
        Trying to webpackify non-string-literals is like opening a can of bad things.
        Even a simple string concatenation like:

            ComplexCallAsset ("elm_logo" ++ ".svg")

        results in a function call in compiled JavaScript code:

            _user$project$ComplexCall$ComplexCallAsset(
                A2(_elm_lang$core$Basics_ops[\'++\'], \'elm_logo\', \'.svg\'))

        If we wrap this in a call to `require`, webpack will create a
        [context module][context-module].

            _user$project$ComplexCall$ComplexCallAsset(
                require(A2(_elm_lang$core$Basics_ops[\'++\'], \'elm_logo\', \'.svg\')))

       Which "contains references to all modules in that directory that can be
       required with a request matching the regular expression." Since webpack
       can't predict what will come out of the `A2` function call, webpack
       will try to include all possible modules in the context module. This
       leads to bloated bundles and lots of warnings from trying to load every
       file in the directory where the Elm file is in.

          [context-module]: https://webpack.github.io/docs/context.html#context-module
      */
      return;
    }

    // transform argument value to local path if desired

    if (typeof options.localPath === 'function') {
      argument.value = options.localPath(argument.value);
      if (typeof argument.value !== 'string') {
        loaderContext.emitError('localPath returned something not a string: ' + argument.value);
      }
    }

    const requireExpression = t.callExpression(t.Identifier('require'), [argument]);
    const replacement = t.callExpression(path.node.callee, [requireExpression]);
    replacement[REPLACED_NODE] = true;

    path.replaceWith(replacement);
  }

  return visitor;
}

module.exports = loader;
