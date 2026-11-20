import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '.husky/_/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: ['**/{domain,application}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'express',
            'express/*',
            'knex',
            'knex/*',
            'pg',
            'pg/*',
            'amqplib',
            'amqplib/*',
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
];
