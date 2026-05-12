import path from 'path';
import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  // Ship a serve.json into the build so `npx serve storybook-static` does not
  // strip `.html` extensions and redirect `/iframe.html?id=…` to `/iframe`,
  // losing the query string and breaking story rendering in the visual tests.
  staticDirs: ['./static'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions', '@storybook/preset-create-react-app'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: false,
  },
  webpackFinal: async (webpackConfig) => {
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias ?? {}),
      src: path.resolve(__dirname, '../src'),
    };
    // App type-checking is handled by `react-app-rewired build`. Storybook only
    // needs to compile stories for visual rendering; ForkTsCheckerWebpackPlugin
    // (injected by the CRA preset) would otherwise re-evaluate the whole app
    // under strict mode and fail on pre-existing type drift unrelated to stories.
    webpackConfig.plugins = (webpackConfig.plugins ?? []).filter(
      (plugin) => plugin?.constructor?.name !== 'ForkTsCheckerWebpackPlugin',
    );
    return webpackConfig;
  },
};

export default config;
