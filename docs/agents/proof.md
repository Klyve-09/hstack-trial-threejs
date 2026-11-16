# Proof

Run these checks in order from the repository root. Every command must exit zero.

| Check | Command |
| --- | --- |
| test | `npm test` |
| lint | `npm run lint` |
| build | `npm run build` |

## Requirements

Node.js 22.12 or newer and npm. Install dependencies with `npm ci` before running the checks. Graphics library: three.js 0.187.0 (locked in `package-lock.json`; `package.json` allows `^0.187.0`). The checks need no GPU or WebGL; running the app needs a WebGL-capable browser.

## Coverage

- `build`: `index.html`
- `build`: `package-lock.json`
- `build`: `package.json`
- `build`: `src/**`
- `build`: `tsconfig.json`
- `lint`: `eslint.config.js`
- `lint`: `package-lock.json`
- `lint`: `package.json`
- `lint`: `src/**/*.ts`
- `test`: `package-lock.json`
- `test`: `package.json`
- `test`: `src/scene.test.ts`
- `test`: `src/scene.ts`
- `test`: `src/settings.test.ts`
- `test`: `src/settings.ts`
- `test`: `tsconfig.json`
- Review-only: `.github/workflows/proof.yml`
- Review-only: `.gitignore`
- Review-only: `AGENTS.md`
- Review-only: `CLAUDE.md`
- Review-only: `LICENSE`
- Review-only: `README.md`
- Review-only: `docs/agents/**`
