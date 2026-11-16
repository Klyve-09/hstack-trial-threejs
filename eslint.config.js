import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
export default tseslint.config(
  { ignores: ['dist/**', 'replay-output/**'] },
  js.configs.recommended,
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  tseslint.configs.recommended,
  { files: ['src/**/*.ts'], languageOptions: { globals: globals.browser } },
)
