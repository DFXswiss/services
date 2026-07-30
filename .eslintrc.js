module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: ['tsconfig.json', 'e2e/tsconfig.json'],
      sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: [
      'plugin:@typescript-eslint/recommended',
      // 'plugin:prettier/recommended',
    ],
    root: true,
    env: {
      node: true,
      jest: true,
    },
    ignorePatterns: ['.eslintrc.js'],
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
    overrides: [
      {
        // jest.mock() factories are hoisted above the imports, so whatever they need has to be
        // pulled in with require() inside the factory.
        files: ['src/__tests__/**/*.{ts,tsx}'],
        rules: {
          '@typescript-eslint/no-var-requires': 'off',
        },
      },
    ],
  };
  