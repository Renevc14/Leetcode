import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'packages/**',
      'databases/**',
      'smithy/**',
      'frontend/**',
      '**/*.d.ts',
      '**/*.tsbuildinfo',
    ],
  },
  {
    files: ['*.{js,mjs,cjs}', '.husky/*'],
    ...js.configs.recommended,
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['microservices/**/*.{ts,mts,cts}'],
    extends: [...tseslint.configs.recommendedTypeChecked, prettier],
    languageOptions: {
      parserOptions: {
        project: ['./microservices/*/tsconfig.json'],
        tsconfigRootDir: process.cwd(),
      },
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
]);
