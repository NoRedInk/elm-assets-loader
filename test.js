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

const compile = (config) => {
  return compileWithStats(config)
    .then(outputAndStats => outputAndStats.output);
};

const compileWithStats = (config) => {
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
      return {output: output, stats: stats.toJson()};
    });
}

/* finding the tagger in compiled JS code */

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

/* argument handling */

test('cannot detect when tagger has multiple args', async t => {
  const config = assign({}, globalConfig, {
    entry: './MultiArg',
    elmAssetsLoader: {
      module: 'MultiArg',
      tagger: 'Asset'
    }
  });
  const result = await compile(config);
  // inside an A2 call
  t.regex(result, /Asset,\s*(["'])elm_logo.svg\1,\s*\1elm_logo.svg\1\)/);
});

test('do not fail when something else is called with multiple args ', async t => {
  const config = assign({}, globalConfig, {
    entry: './IrrelevantMultiArg',
    elmAssetsLoader: {
      module: 'IrrelevantMultiArg',
      tagger: 'AssetPath'
    }
  });
  const result = await compile(config);
  // inside an A2 call
  t.regex(result, /AssetPair,\s*(["'])elm_logo.svg\1,\s*\1elm_logo.svg\1\)/);
});

test('cannot detect if tagger with multiple values is called with a single arg', async t => {
  const config = assign({}, globalConfig, {
    entry: './PartialMultiArg',
    elmAssetsLoader: {
      module: 'PartialMultiArg',
      tagger: 'AssetPair'
    }
  });
  const result = await compile(config);
  t.regex(result, /AssetPair\(__webpack_require__\(\d+\)\)/);
});

test('do not transform tagger that is actually a constant func', async t => {
  const config = assign({}, globalConfig, {
    entry: './NoArg',
    elmAssetsLoader: {
      module: 'NoArg',
      tagger: 'assetPath'
    }
  });
  const result = await compile(config);
  t.regex(result, /assetPath\s*=\s*(["'])star.png\1/);
});

/* dynamicRequires */

test('dynamicRequires: default - warn', async t => {
  const config = assign({}, globalConfig, {
    entry: './ComplexCall',
    elmAssetsLoader: {
      module: 'ComplexCall',
      tagger: 'ComplexCallAsset'
    }
  });
  const result = await compileWithStats(config);
  t.regex(result.output, /ComplexCallAsset\(A2/);
  t.regex(result.output, /ComplexCallAsset\(A2/);
  t.regex(result.stats.warnings[0], /will not be run through webpack.*ComplexCallAsset/);
});

test('dynamicRequires: ok - be silent', async t => {
  const config = assign({}, globalConfig, {
    entry: './ComplexCall',
    elmAssetsLoader: {
      module: 'ComplexCall',
      tagger: 'ComplexCallAsset',
      dynamicRequires: 'ok'
    }
  });
  const result = await compileWithStats(config);
  t.regex(result.output, /ComplexCallAsset\(A2/);
  t.is(result.stats.warnings.length, 0);
});

test('dynamicRequires: warn - just warn', async t => {
  const config = assign({}, globalConfig, {
    entry: './ComplexCall',
    elmAssetsLoader: {
      module: 'ComplexCall',
      tagger: 'ComplexCallAsset',
      dynamicRequires: 'warn'
    }
  });
  const result = await compileWithStats(config);
  t.regex(result.output, /ComplexCallAsset\(A2/);
  t.regex(result.stats.warnings[0], /will not be run through webpack.*ComplexCallAsset/);
});

test('dynamicRequires: error - raise when non string literal', async t => {
  const config = assign({}, globalConfig, {
    entry: './ComplexCall',
    elmAssetsLoader: {
      module: 'ComplexCall',
      tagger: 'ComplexCallAsset',
      dynamicRequires: 'error'
    }
  });
  t.throws(compile(config), /Failing hard to make sure all assets.*ComplexCallAsset/);
});

/* localPath */

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

/* query params */

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

test('raise when dynamicRequires is set to an unknown value', async t => {
  const config = assign({}, globalConfig, {
    entry: './UserProject',
    elmAssetsLoader: {
      module: 'UserProject',
      tagger: 'Asset',
      dynamicRequires: 'ignore'
    }
  });
  t.throws(compile(config), /Expecting dynamicRequires to be one of: error | warn | ok. You gave me: ignore/);
});
