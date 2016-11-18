'use strict';

const loaderUtils = require('loader-utils');
const babel = require('babel-core');

const loader = function(source, inputSourceMap) {
  this.cacheable && this.cacheable();

  const query = loaderUtils.parseQuery(this.query);
  const configKey = query.config || "elmAssetsLoader";
  const options = this.options[configKey] || {};

  const config = {
    localPath: false
  };

  // options takes precedence over config
  Object.keys(options).forEach(function(attr) {
    config[attr] = options[attr];
  });

  // query takes precedence over config and options
  Object.keys(query).forEach(function(attr) {
    config[attr] = query[attr];
  });

  if(!(config.hasOwnProperty('module') &&
       config.hasOwnProperty('tagger'))) {
    throw new Error("Please configure module and tagger to use this loader.");
  }

  const packageName = config['package'] || 'user/project';
  const taggerName = '_' + [
    packageName.replace(/-/g, '_').replace(/\//g, '$'),
    config.module.replace(/\./g, '_'),
    config.tagger
  ].join('$');
  const localPath = config.localPath;

  const webpackRemainingChain = loaderUtils.getRemainingRequest(this).split("!");
  const filename  = webpackRemainingChain[webpackRemainingChain.length - 1];
  const babelOptions = {
    inputSourceMap: inputSourceMap,
    sourceRoot: process.cwd(),
    filename: filename,
    compact: false
  };

  const result = transform(source, taggerName, localPath, babelOptions);

  this.callback(null, result.code, result.map);
};

const transform = function(source, taggerName, localPath, babelOptions) {
  babelOptions.plugins = [assetTransformer(taggerName, localPath)];

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

const assetTransformer = function(taggerName, localPath) {
  const plugin = function({ types: t }) {
    return {
      visitor: {
        CallExpression: callExpressionVisitor(t, taggerName, localPath)
      }
    }
  };

  return plugin;
}

const REPLACED_NODE = Symbol('elmAssetsLoaderReplaced');

const callExpressionVisitor = function(t, taggerName, localPath) {
  const visitor = function(path) {
    // avoid infinite recursion
    if (path.node[REPLACED_NODE]) {
      return;
    }

    // calling the tagger we want?

    if (!t.isIdentifier(path.node.callee)) {
      return;
    }

    if (path.node.callee.name !== taggerName) {
      return;
    }

    // don't know what to do with multiple args
    if (path.node.arguments.length > 1) {
      throw new Error("Tagger that tags multiple strings is currently not supported.");
    }

    // just in case: check for zero args
    if (path.node.arguments.length === 0) {
      throw new Error("Tagger must tag one string.");
    }

    const argument = path.node.arguments[0];

    // replace only strings
    if (!(t.isLiteral(argument) && typeof argument.value === 'string')) {
      return;
    }

    // transform argument value to local path if desired

    if (typeof localPath === 'function') {
      argument.value = localPath(argument.value);
      if (typeof argument.value !== 'string') {
        throw new TypeError('localPath returned something not a string: ' + argument.value);
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
