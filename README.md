# Quiet forms

A small three.js viewer with a cube, sphere, and cone on a lit ground plane.
Start exploring, drag to orbit, scroll to zoom, or right-drag to pan. On touch
screens, drag with one finger to orbit and use two fingers to zoom or pan.

The Settings panel controls background color, soft shadows, and the ground
grid. Preferences are saved only in this browser's localStorage under
`quiet-forms.settings.v1` and restored on the next visit. Clearing site data
resets them. If storage is unavailable, settings still work for the current visit.
There are no accounts or backend services; all scene assets are created locally.

## Development

Use Node.js 22.12 or newer and npm. A WebGL-capable browser is required.

```sh
npm ci
npm run dev
```

Vite prints the development URL. Other commands:

```sh
npm test          # Vitest unit tests, no WebGL required
npm run lint     # ESLint with typescript-eslint flat config
npm run build    # TypeScript checks and production bundle in dist/
npm run preview  # Serve the production bundle at http://localhost:4173
```

Created from the official Vite `vanilla-ts` template. TypeScript 6 is used for
compatibility with typescript-eslint. The app uses three.js and OrbitControls;
objects remain stationary while you move the camera. Resize handling adapts the
canvas to the window. No external models, textures, or fonts are needed.

## License

MIT © Klyve
