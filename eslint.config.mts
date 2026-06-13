import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const tsconfigRootDir = new URL('.', import.meta.url).pathname;

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
    files: [
      'microservices/**/src/**/*.ts',
      'microservices/**/src/**/*.mts',
      'microservices/**/src/**/*.cts',
    ],
    extends: [...tseslint.configs.recommendedTypeChecked, prettier],
    languageOptions: {
      parserOptions: {
        project: ['./microservices/*/tsconfig.json'],
        tsconfigRootDir,
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
