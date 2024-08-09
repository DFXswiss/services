const path = require('path');
const webpack = require('webpack');
const version = require('./package.json').version;
const widgetVersion = version.split('.').slice(0, 2).join('.');

module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    url: require.resolve('url/'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    'process/browser': require.resolve('process/browser'),
  };
  config.resolve.extensions = [...config.resolve.extensions, '.ts', '.js'];
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];
  config.output = {
    ...config.output,
    ...(process.env.PUBLIC_URL && process.env.CUSTOM_CHUNK_PATH
      ? {
          publicPath: process.env.PUBLIC_URL + process.env.CUSTOM_CHUNK_PATH,
          chunkFilename: config.output.chunkFilename.replace('static/js', `v${widgetVersion}-chunks`),
          webassemblyModuleFilename: `v${widgetVersion}-chunks/[hash].module.wasm`,
        }
      : undefined),
  };

  // add support for WASM
  const wasmExtensionRegExp = /\.wasm$/;
  config.resolve.extensions.push('.wasm');
  config.module.rules.forEach((rule) => {
    (rule.oneOf || []).forEach((oneOf) => {
      if (oneOf.type === 'asset/resource') {
        oneOf.exclude.push(wasmExtensionRegExp);
      }
    });
  });
  config.module.rules.push({
    test: wasmExtensionRegExp,
    include: path.resolve(__dirname, 'src'),
    use: [{ loader: require.resolve('wasm-loader'), options: {} }],
  });
  config.experiments = {
    asyncWebAssembly: true,
  };

  return config;
};
