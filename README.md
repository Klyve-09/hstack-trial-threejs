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
the teal sphere drifts at 1.2 ground units per second while you move the camera. Resize handling adapts the
canvas to the window. No external models, textures, or fonts are needed.

## Drift and input replay

The teal sphere starts drifting right. Arrow keys steer it left, right, toward,
or away from the camera's initial view (world X/Z axes); it keeps its latest
heading after release and bounces within X/Z ±4. Movement uses a 60 Hz fixed
simulation step, independent of display refresh rate. Gaps are capped at 0.25
seconds; returning from Home resets the clock.

In the viewer, **Record** resets the sphere and held actions. **Stop** downloads
`drift.json`; recordings stop automatically at 30 seconds of simulation time.
The JSON includes version, scene, resolution, fixedStep, action transitions at
zero-based step indices, captureFrames, and endFrame. A transition at frame 0
applies before the first step; position frame 0 is the initial state. Capture
frames are snapshots after that many steps. Supported resolutions are 1–3840
by 1–2160 pixels, and runs may contain up to 1800 steps.

Run the committed ten-second example from the repository root:

```sh
npm run replay -- replays/drift.json --out replay-output
```

The runner uses Playwright Chromium with software WebGL and `/usr/bin/ffmpeg`.
Playwright 1.56.1 uses browser build 1194, available on the implementation VM.
On a machine without that browser, install it first:

```sh
npx playwright install chromium --only-shell
```

Append `--headed` to watch in a browser window (requires a graphical session
and a full Playwright Chromium installation rather than only the headless shell).
The input file may be anywhere on disk. The runner starts and closes Vite and
Chromium, writes `frames/000000.png` onward, `capture-*.png` for requested
snapshots, `states.json` (frame → sphere X/Z), and `drift.mp4` at 60 fps.
`replay-output/` is ignored by Git. Use a dedicated output directory; matching
output files are overwritten. Video duration is at most 30 seconds.

To play in the viewer, serve a replay JSON at a URL and open `?replay=<url>`.
Keyboard steering and recording are disabled in replay mode. The runner adds
`&manual=1` to disable wall-clock advancement and uses
`window.__replay.ready`, `.frame`, `.position`, `.done`, `.advance()`, and
`.stepTo(n)` to render exact simulation frames. The hook advances forward only.

## License

MIT © Klyve
