import antfu from '@antfu/eslint-config';

const common = {
  ignores: ['node_modules', '**/node_modules/**', 'dist', '**/dist/**'],
  typescript: true,
  formatters: true,

  stylistic: {
    arrowParens: true,
    blockSpacing: true,
    braceStyle: '1tbs',
    commaDangle: 'always',
    indent: 2,
    quoteProps: 'as-needed',
    quotes: 'single',
    semi: true,
  },

  rules: {
    'style/brace-style': ['error', '1tbs', { allowSingleLine: false }],
    'curly': ['error', 'all'],

    'perfectionist/sort-imports': [
      'error',
      {
        type: 'natural',
        order: 'asc',
        sortSideEffects: false,

        groups: [
          ['side-effect', 'side-effect-style'],
          'type',
          ['builtin', 'external'],
          'internal-type',
          'internal',
          ['parent-type', 'sibling-type', 'index-type'],
          ['parent', 'sibling', 'index'],
          'object',
          'unknown',
        ],
      },
    ],

    'no-console': ['off'],
  },
};

const json5 = {
  files: ['**/*.json5'],
  rules: {
    'jsonc/quote-props': ['error', 'as-needed'],
    'jsonc/quotes': ['error', 'single'],
    'jsonc/no-number-props': ['off'],
  },
};

const full = [common, json5];



export default antfu(...full);
