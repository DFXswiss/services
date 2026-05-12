import path from 'path';
import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
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
    return webpackConfig;
  },
};

export default config;
