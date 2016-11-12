import test from 'ava';
import path from 'path';
import assign from "object-assign";
import MemoryFS from 'memory-fs';
import webpack from 'webpack';
import pify from 'pify';
import elmAssetsLoader from './index.js';

const outputPath = path.join(__dirname, 'build');
const fixturesPath = path.join(__dirname, "fixtures");
const elmMakePath = path.join(__dirname, 'node_modules/.bin/elm-make');

const globalConfig = {
  context: fixturesPath,
  output: {
    path: outputPath,
    filename: 'main.js'
  },
  resolve: {
    root: fixturesPath,
    extensions: ['', '.js', '.elm']
  },
  module: {
    loaders: [
      {
        test: /\.elm$/,
        loaders: [
          path.join(__dirname, 'index.js'),
          'elm-webpack?cwd=' + fixturesPath + '&pathToMake=' + elmMakePath
        ]
      },
      {
        test: /\.svg$/,
        loader: 'file-loader'
      }
    ]
  },
  plugins: [
    new webpack.NoErrorsPlugin()
  ]
};

const compile = (config, cb) => {
  const fs = new MemoryFS();
  const compiler = webpack(config);
  compiler.outputFileSystem = fs;
  return pify(compiler.run.bind(compiler))()
    .then(stats => {
      if (stats.compilation.errors.length > 0) {
        throw stats.compilation.errors.map(error => error.message);
      }
      const exitPath = path.join(outputPath, 'main.js');
      const output = fs.readFileSync(exitPath).toString('utf-8');
      return output;
    });
};

test('transform tagger in a package with hyphen', async t => {
  const config = assign({}, globalConfig, {
    entry: './Just',
    elmAssetsLoader: {
      package: 'elm-lang/core',
      module: 'Maybe',
      tagger: 'Just'
    }
  });
  const result = await compile(config);
  t.regex(result, /Just\(__webpack_require__\(\d+\)\)/);
});

test('transform tagger not in package', async t => {
  const config = assign({}, globalConfig, {
    entry: './UserProject',
    elmAssetsLoader: {
      module: 'UserProject',
      tagger: 'Asset'
    }
  });
  const result = await compile(config);
  t.regex(result, /Asset\(__webpack_require__\(\d+\)\)/);
});

test('do not transform tagger in different package', async t => {
  const config = assign({}, globalConfig, {
    entry: './MyMaybe',
    elmAssetsLoader: {
      module: 'MyMaybe',
      tagger: 'Just'
    }
  });
  const result = await compile(config);
  t.regex(result, /Just\((["'])dont_touch_me.png\1\)/);
});

test('do not transform tagger in different module', async t => {
  const config = assign({}, globalConfig, {
    entry: './MyTag',
    elmAssetsLoader: {
      module: 'MyTag',
      tagger: 'Asset'
    }
  });
  const result = await compile(config);
  t.regex(result, /Asset\((["'])dont_touch_me.png\1\)/);
});

test('do not transform tagger that is not a function', async t => {
  const config = assign({}, globalConfig, {
    entry: './SimpleString',
    elmAssetsLoader: {
      module: 'SimpleString',
      tagger: 'assetPath'
    }
  });
  const result = await compile(config);
  t.regex(result, /assetPath = (["'])elm_logo.svg\1/);
});

test('do not transform tagger with multiple args', async t => {
  const config = assign({}, globalConfig, {
    entry: './MultiArg',
    elmAssetsLoader: {
      module: 'MultiArg',
      tagger: 'Asset'
    }
  });
  const result = await compile(config);
  // compiled to an A2 call
  t.regex(result, /Asset,\s*(["'])elm_logo.svg\1,\s*\1elm_logo.svg\1\)/);
  // TODO: either raise or warn
});

test('do not transform tagger arg not a string literal', async t => {
  const config = assign({}, globalConfig, {
    entry: './ComplexCall',
    elmAssetsLoader: {
      module: 'ComplexCall',
      tagger: 'Asset'
    }
  });
  const result = await compile(config);
  // compiled to an A2 call
  t.regex(result, /Asset\(A2/);
  t.regex(result, /(["'])elm_logo\1,\s*\1.svg\1\)/);
});

test('find module after applying localPath transformation', async t => {
  const config = assign({}, globalConfig, {
    entry: './LocalPathOverride',
    elmAssetsLoader: {
      module: 'LocalPathOverride',
      tagger: 'Asset',
      localPath: s => 'elm_logo.svg'
    }
  });
  const result = await compile(config);
  t.regex(result, /Asset\(__webpack_require__\(\d+\)\)/);
});

test('fail to find module when localPath is not correctly configured', async t => {
  const config = assign({}, globalConfig, {
    entry: './LocalPathOverride',
    elmAssetsLoader: {
      module: 'LocalPathOverride',
      tagger: 'Asset'
    }
  });
  t.throws(compile(config), /Cannot resolve module \'non_sensical.png\'/);
});

test('raise when localPath does not return a string', async t => {
  const config = assign({}, globalConfig, {
    entry: './LocalPathOverride',
    elmAssetsLoader: {
      module: 'LocalPathOverride',
      tagger: 'Asset',
      localPath: s => 42
    }
  });
  t.throws(compile(config), /not a string/);
});

test('require module to be configured', async t => {
  const config = assign({}, globalConfig, {
    entry: './UserProject',
    elmAssetsLoader: {
      tagger: 'Asset'
    }
  });
  t.throws(compile(config), /configure module and tagger/);
});

test('require tagger to be configured', async t => {
  const config = assign({}, globalConfig, {
    entry: './UserProject',
    elmAssetsLoader: {
      module: 'UserProject'
    }
  });
  t.throws(compile(config), /configure module and tagger/);
});
