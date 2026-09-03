// Lint config for the three front-end workspaces: shared, mobile, web.
// The backend is not covered yet - it gets its own setup when that phase starts.
//
// The react-hooks rules matter most here: they catch conditional or nested hook
// calls, which are easy to introduce when a screen grows an early return.

const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');
const globals = require('globals');

module.exports = tseslint.config(
  {
    // Never lint build output, dependencies, or the standalone spike.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/web-build/**',
      '**/.expo/**',
      'site/**',
      'spike/**',
      'backend/**',
      'docs/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['{shared,mobile,web}/**/*.{ts,tsx}', 'mobile/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Unused variables are worth flagging, but an underscore prefix is the
      // conventional way to say "deliberately ignored".
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // Navigation props are typed as `any` in a few screens because React
      // Navigation's generics need a route map this project does not maintain yet.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  {
    // Config and build scripts run in Node, not the browser.
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  {
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module' },
  },
);
