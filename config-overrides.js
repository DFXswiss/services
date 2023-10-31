const webpack = require('webpack');
const version = require('./package.json').version;

module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    url: require.resolve('url/'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
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
          chunkFilename: config.output.chunkFilename.replace('static/js', `v${version}-chunks`),
        }
      : undefined),
  };
  return config;
};
