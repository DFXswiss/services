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
    // Story files are excluded from tsconfig.json, so the type-aware parser cannot resolve them.
    ignorePatterns: ['.eslintrc.js', '**/*.stories.tsx'],
    overrides: [
      {
        // Cloudflare Pages Functions are deployed but never bundled into the app, so they sit
        // outside tsconfig.json and the type-aware parser cannot resolve them. Linting them
        // without type information still catches the failure that matters here: a syntax error in
        // a file that reaches production without any other check ever reading it.
        files: ['functions/**/*.js'],
        parserOptions: { project: null },
        env: { browser: true, node: false, jest: false },
      },
    ],
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
  };
  