import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import { chromium } from 'playwright'

async function main() {
  const args = process.argv.slice(2)
  const input = args.shift()
  if (!input || input.startsWith('--')) throw new Error('Usage: npm run replay -- <file.json> [--out <dir>] [--headed]')
  let out = resolve('replay-output')
  let headed = false
  while (args.length) {
    const arg = args.shift()
    if (arg === '--headed') headed = true
    else if (arg === '--out' && args[0]) out = resolve(args.shift())
    else throw new Error(`Unknown or incomplete option: ${arg}`)
  }
  const json = await readFile(resolve(input), 'utf8')
  const server = await createServer({
    server: { host: '127.0.0.1', port: 0, hmr: false },
    logLevel: 'error',
    plugins: [{
      name: 'replay-input',
      configureServer(vite) {
        vite.middlewares.use('/__input.json', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(json)
        })
      },
    }],
  })
  let browser
  try {
    const { parseReplay } = await server.ssrLoadModule('/src/replay.ts')
    const replay = parseReplay(json)
    await server.listen()
    const address = server.httpServer.address()
    browser = await chromium.launch({ headless: !headed, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
    const page = await browser.newPage({ viewport: replay.resolution, deviceScaleFactor: 1 })
    let failure
    page.on('pageerror', error => { failure = error })
    await page.goto(`http://127.0.0.1:${address.port}/?replay=/__input.json&manual=1`)
    await page.waitForFunction(() => window.__replay?.ready || !document.querySelector('#error').hidden, undefined, { timeout: 30000 })
    const error = await page.locator('#error').textContent()
    if (error || failure) throw failure ?? new Error(error)
    const frames = join(out, 'frames')
    await mkdir(frames, { recursive: true })
    const videoFrames = Math.max(1, replay.endFrame)
    const states = []
    const captured = []
    for (let frame = 0; frame <= replay.endFrame; frame++) {
      if (failure) throw failure
      const state = await page.evaluate(() => ({ frame: window.__replay.frame, ...window.__replay.position }))
      if (state.frame !== frame) throw new Error(`Replay frame mismatch: expected ${frame}, got ${state.frame}`)
      states.push(state)
      if (frame < videoFrames || replay.captureFrames.includes(frame)) {
        const png = await page.screenshot({ timeout: 30000 })
        if (frame < videoFrames) await writeFile(join(frames, `${String(frame).padStart(6, '0')}.png`), png)
        if (replay.captureFrames.includes(frame)) {
          const name = `capture-${String(frame).padStart(6, '0')}.png`
          await writeFile(join(out, name), png)
          captured.push(name)
        }
      }
      if (frame < replay.endFrame) await page.evaluate(() => window.__replay.advance())
    }
    await writeFile(join(out, 'states.json'), JSON.stringify(states, null, 2))
    await new Promise((accept, reject) => {
      const ffmpeg = spawn('/usr/bin/ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '60', '-start_number', '0', '-i', join(frames, '%06d.png'), '-frames:v', String(videoFrames), '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', join(out, 'drift.mp4')], { stdio: 'inherit' })
      ffmpeg.on('error', reject)
      ffmpeg.on('exit', code => code === 0 ? accept() : reject(new Error(`ffmpeg exited ${code}`)))
    })
    console.log(JSON.stringify({ out, frames: videoFrames, captures: captured, video: 'drift.mp4', states: 'states.json' }, null, 2))
  } finally {
    await browser?.close()
    await server.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
