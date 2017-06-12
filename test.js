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

const globalConfig = (loaderConfig) => {
  return {
    context: fixturesPath,
    output: {
      path: outputPath,
      filename: 'main.js'
    },
    resolve: {
      modules: [
        fixturesPath
      ],
      extensions: ['.js', '.elm']
    },
    module: {
      rules: [
        {
          test: /\.elm$/,
          use: [
            loaderConfig,
            'elm-webpack-loader?cwd=' + fixturesPath + '&pathToMake=' + elmMakePath
          ]
        },
        {
          test: /\.svg$/,
          use: 'file-loader'
        }
      ]
    },
    plugins: [
      new webpack.NoErrorsPlugin()
    ]
  };
};

const makeConfig = (extraConfig, loaderOptions) => {
  const loaderConfig = {
    loader: path.join(__dirname, 'index.js'),
    options: loaderOptions
  };
  return assign({}, globalConfig(loaderConfig), extraConfig);
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
  const config = makeConfig({
    entry: './Just'
  }, {
    package: 'elm-lang/core',
    module: 'Maybe',
    tagger: 'Just'
  });
  const result = await compile(config);
  t.regex(result, /Just\(__webpack_require__\(\d+\)\)/);
});

test('transform tagger not in package', async t => {
  const config = makeConfig({
    entry: './UserProject'
  }, {
    module: 'UserProject',
    tagger: 'Asset'
  });
  const result = await compile(config);
  t.regex(result, /Asset\(__webpack_require__\(\d+\)\)/);
});

test('do not transform tagger in different package', async t => {
  const config = makeConfig({
    entry: './MyMaybe'
  }, {
    module: 'MyMaybe',
    tagger: 'Just'
  });
  const result = await compile(config);
  t.regex(result, /Just\((["'])dont_touch_me.png\1\)/);
});

test('do not transform tagger in different module', async t => {
  const config = makeConfig({
    entry: './MyTag'
  }, {
    module: 'MyTag',
    tagger: 'Asset'
  });
  const result = await compile(config);
  t.regex(result, /Asset\((["'])dont_touch_me.png\1\)/);
});

/* argument handling */

test('cannot detect when tagger has multiple args', async t => {
  const config = makeConfig({
    entry: './MultiArg'
  }, {
    module: 'MultiArg',
    tagger: 'Asset'
  });
  const result = await compile(config);
  // inside an A2 call
  t.regex(result, /Asset,\s*(["'])elm_logo.svg\1,\s*\1elm_logo.svg\1\)/);
});

test('do not fail when something else is called with multiple args ', async t => {
  const config = makeConfig({
    entry: './IrrelevantMultiArg'
  }, {
    module: 'IrrelevantMultiArg',
    tagger: 'AssetPath'
  });
  const result = await compile(config);
  // inside an A2 call
  t.regex(result, /AssetPair,\s*(["'])elm_logo.svg\1,\s*\1elm_logo.svg\1\)/);
});

test('cannot detect if tagger with multiple values is called with a single arg', async t => {
  const config = makeConfig({
    entry: './PartialMultiArg'
  }, {
    module: 'PartialMultiArg',
    tagger: 'AssetPair'
  });
  const result = await compile(config);
  t.regex(result, /AssetPair\(__webpack_require__\(\d+\)\)/);
});

test('do not transform tagger that is actually a constant func', async t => {
  const config = makeConfig({
    entry: './NoArg'
  }, {
    module: 'NoArg',
    tagger: 'assetPath'
  });
  const result = await compile(config);
  t.regex(result, /assetPath\s*=\s*(["'])star.png\1/);
});

/* dynamicRequires */

test('dynamicRequires: default - warn', async t => {
  const config = makeConfig({
    entry: './ComplexCall'
  }, {
    module: 'ComplexCall',
    tagger: 'ComplexCallAsset'
  });
  const result = await compileWithStats(config);
  t.regex(result.output, /ComplexCallAsset\(A2/);
  t.regex(result.output, /ComplexCallAsset\(A2/);
  t.regex(result.stats.warnings[0], /will not be run through webpack.*ComplexCallAsset/);
});

test('dynamicRequires: ok - be silent', async t => {
  const config = makeConfig({
    entry: './ComplexCall'
  }, {
    module: 'ComplexCall',
    tagger: 'ComplexCallAsset',
    dynamicRequires: 'ok'
  });
  const result = await compileWithStats(config);
  t.regex(result.output, /ComplexCallAsset\(A2/);
  t.is(result.stats.warnings.length, 0);
});

test('dynamicRequires: warn - just warn', async t => {
  const config = makeConfig({
    entry: './ComplexCall'
  }, {
    module: 'ComplexCall',
    tagger: 'ComplexCallAsset',
    dynamicRequires: 'warn'
  });
  const result = await compileWithStats(config);
  t.regex(result.output, /ComplexCallAsset\(A2/);
  t.regex(result.stats.warnings[0], /will not be run through webpack.*ComplexCallAsset/);
});

test('dynamicRequires: error - raise when a string concatenation is tagge', async t => {
  const config = makeConfig({
    entry: './ComplexCall'
  }, {
    module: 'ComplexCall',
    tagger: 'ComplexCallAsset',
    dynamicRequires: 'error'
  });
  await t.throws(compile(config), /Failing hard to make sure all assets.*ComplexCallAsset/);
});

test('dynamicRequires: error - raise when a variable is tagged', async t => {
  const config = makeConfig({
    entry: './VariableCall'
  }, {
    module: 'VariableCall',
    tagger: 'VariableCallAsset',
    dynamicRequires: 'error'
  });
  await t.throws(compile(config), /Failing hard to make sure all assets.*VariableCallAsset/);
});

/* localPath */

test('find module after applying localPath transformation', async t => {
  const config = makeConfig({
    entry: './LocalPathOverride'
  }, {
    module: 'LocalPathOverride',
    tagger: 'Asset',
    localPath: s => 'elm_logo.svg'
  });
  const result = await compile(config);
  t.regex(result, /Asset\(__webpack_require__\(\d+\)\)/);
});

test('fail to find module when localPath is not correctly configured', async t => {
  const config = makeConfig({
    entry: './LocalPathOverride'
  }, {
    module: 'LocalPathOverride',
    tagger: 'Asset'
  });
  await t.throws(compile(config), /Can't resolve \'non_sensical.png\'/);
});

test('raise when localPath does not return a string', async t => {
  const config = makeConfig({
    entry: './LocalPathOverride'
  }, {
    module: 'LocalPathOverride',
    tagger: 'Asset',
    localPath: s => 42
  });
  await t.throws(compile(config), /not a string/);
});

/* query params */

test('require module to be configured', async t => {
  const config = makeConfig({
    entry: './UserProject'
  }, {
    tagger: 'Asset'
  });
  await t.throws(compile(config), /configure module and tagger/);
});

test('require tagger to be configured', async t => {
  const config = makeConfig({
    entry: './UserProject'
  }, {
    module: 'UserProject'
  });
  await t.throws(compile(config), /configure module and tagger/);
});

test('raise when dynamicRequires is set to an unknown value', async t => {
  const config = makeConfig({
    entry: './UserProject'
  }, {
    module: 'UserProject',
    tagger: 'Asset',
    dynamicRequires: 'ignore'
  });
  await t.throws(compile(config), /Expecting dynamicRequires to be one of: error | warn | ok. You gave me: ignore/);
});
