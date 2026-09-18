import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['node_modules/**', 'out/**', 'media/**']
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.ts', 'tests/**/*.ts', 'web/**/*.ts'],
		rules: {
			'no-alert': 'error',
			'no-console': 'error',
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-labels': 'error',
			'no-proto': 'error',
			'no-prototype-builtins': 'error',
			'no-script-url': 'error',
			'no-with': 'error',
			'@typescript-eslint/ban-ts-comment': 'error',
			// TypeScript performs unused-symbol analysis across the legacy webview namespace.
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			// These constructs are intentional in the existing ES5-compatible webview.
			'prefer-const': 'off',
			'no-empty': 'off',
			'no-useless-escape': 'off',
			'no-cond-assign': 'off',
			'no-case-declarations': 'off',
			'no-async-promise-executor': 'off',
			'no-constant-condition': 'off',
			'no-control-regex': 'off'
		}
	},
	{
		files: ['web/**/*.ts'],
		rules: {
			'@typescript-eslint/no-namespace': 'off'
		}
	},
	{
		files: ['src/repoManager.ts'],
		rules: {
			'@typescript-eslint/no-namespace': 'off'
		}
	},
	{
		files: ['src/askpass/**/*.ts'],
		rules: {
			'no-console': 'off'
		}
	},
	{
		files: ['tests/mocks/**/*.ts'],
		rules: {
			'no-global-assign': 'off'
		}
	}
);
