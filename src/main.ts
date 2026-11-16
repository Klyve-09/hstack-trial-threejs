import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildScene, applySceneSettings } from './scene'
import { defaultSettings, loadSettings, saveSettings } from './settings'
import type { Settings } from './settings'
import { actionMap } from './input'
import type { Action } from './input'
import { createLoop, FIXED_STEP } from './loop'
import { initialState, step } from './motion'
import { createPlayback, createReplay, MAX_FRAMES, MAX_WIDTH, MAX_HEIGHT, parseReplay, setAction } from './replay'
import type { Replay } from './replay'

const params = new URLSearchParams(location.search)
const replayUrl = params.get('replay')
const manualReplay = !!replayUrl && params.has('manual')
let state = initialState()
const held = new Set<Action>()
let recording: Replay | undefined
let playback: ReturnType<typeof createPlayback> | undefined
let loop = newLiveLoop()
let draw = () => {}

function newLiveLoop() {
  return createLoop(() => {
    if (playback) playback.advance()
    else step(state, held, FIXED_STEP)
    if (recording && loop.frame >= MAX_FRAMES) stopRecording()
  })
}

interface ReplayHook {
  ready: boolean
  readonly frame: number
  readonly position: { x: number; z: number }
  advance(): void
}
declare global { interface Window { __replay?: ReplayHook } }

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <section id="welcome" class="welcome">
    <p class="eyebrow">A STUDY IN LIGHT & FORM</p>
    <h1>Quiet forms<span>.</span></h1>
    <p>Three simple shapes. A little space to explore.</p>
    <button id="start" class="primary">Start exploring <span aria-hidden="true">↗</span></button>
    <small>Drag to orbit · Scroll to zoom · Right-drag to pan</small>
  </section>
  <section id="viewer" hidden aria-label="3D viewer">
    <div id="viewport"></div>
    <header><button id="home" class="brand">Quiet forms<span>.</span></button><div class="toolbar"><button id="record">Record</button><button id="settings-toggle" aria-expanded="false" aria-controls="settings">Settings</button></div></header>
    <p class="hint">Drag to orbit <span>·</span> Scroll to zoom <span>·</span> Right-drag to pan <span>·</span> Arrow keys steer the sphere</p>
    <aside id="settings" hidden aria-labelledby="settings-title">
      <div class="panel-heading"><h2 id="settings-title">Your scene</h2><button id="close-settings" aria-label="Close settings">✕</button></div>
      <p class="muted">Make a little room for your taste.</p>
      <label class="setting" for="background">Background <input id="background" type="color"></label>
      <label class="setting" for="shadows">Soft shadows <input id="shadows" type="checkbox"></label>
      <label class="setting" for="grid">Ground grid <input id="grid" type="checkbox"></label>
      <p id="save-status" class="muted" role="status">Settings stay on this device.</p>
    </aside>
    <p id="error" role="alert" hidden></p>
  </section>`

const welcome = document.querySelector<HTMLElement>('#welcome')!
const viewer = document.querySelector<HTMLElement>('#viewer')!
const viewport = document.querySelector<HTMLElement>('#viewport')!
const panel = document.querySelector<HTMLElement>('#settings')!
const toggle = document.querySelector<HTMLButtonElement>('#settings-toggle')!
let settings: Settings
try { settings = loadSettings(window.localStorage) } catch { settings = { ...defaultSettings } }
let renderer: THREE.WebGLRenderer | undefined
let resize = () => {}
let update = () => {}
let renderFrame = () => {}

function initializeViewer() {
  const nextRenderer = new THREE.WebGLRenderer({ antialias: true })
  renderer = nextRenderer
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.setAttribute('aria-label', 'A terracotta cube, teal sphere, and golden cone on a ground plane')
  renderer.domElement.setAttribute('role', 'img')
  viewport.append(renderer.domElement)
  const { scene, grid, shapes } = buildScene()
  const sphere = shapes.getObjectByName('sphere')!
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(7, 5, 9)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.7, 0)
  controls.minDistance = 4
  controls.maxDistance = 20
  controls.maxPolarAngle = Math.PI / 2 - 0.03
  controls.update()
  resize = () => {
    const { clientWidth, clientHeight } = viewport
    camera.aspect = clientWidth / clientHeight
    camera.updateProjectionMatrix()
    nextRenderer.setSize(clientWidth, clientHeight)
  }
  update = () => {
    applySceneSettings(scene, grid, settings)
    nextRenderer.shadowMap.enabled = settings.shadows
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
        object.material.needsUpdate = true
      }
    })
  }
  update()
  resize()
  window.addEventListener('resize', resize)
  draw = () => {
    const position = playback?.state.position ?? state.position
    sphere.position.x = position.x
    sphere.position.z = position.z
    nextRenderer.render(scene, camera)
  }
  renderFrame = () => {
    if (!manualReplay) loop.tick(performance.now() / 1000)
    draw()
  }
  if (!manualReplay) renderer.setAnimationLoop(renderFrame)
}

function showPanel(open: boolean) {
  panel.hidden = !open
  toggle.setAttribute('aria-expanded', String(open))
  if (!open) toggle.focus()
}

function startViewer() {
  loop.resetClock()
  welcome.hidden = true
  viewer.hidden = false
  try {
    if (!renderer) initializeViewer()
    else { resize(); if (!manualReplay) renderer.setAnimationLoop(renderFrame) }
    toggle.focus()
  } catch {
    renderer?.dispose()
    renderer = undefined
    const error = document.querySelector<HTMLElement>('#error')!
    error.textContent = 'The 3D scene could not start. Please use a browser with WebGL enabled.'
    error.hidden = false
  }
}
document.querySelector('#start')!.addEventListener('click', startViewer)
document.querySelector('#home')!.addEventListener('click', () => {
  clearHeld()
  loop.resetClock()
  renderer?.setAnimationLoop(null)
  viewer.hidden = true
  welcome.hidden = false
  showPanel(false)
  document.querySelector<HTMLButtonElement>('#start')!.focus()
})
toggle.addEventListener('click', () => showPanel(panel.hasAttribute('hidden')))
document.querySelector('#close-settings')!.addEventListener('click', () => showPanel(false))
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) showPanel(false) })

for (const key of ['background', 'shadows', 'grid'] as const) {
  const input = document.querySelector<HTMLInputElement>(`#${key}`)!
  if (key === 'background') input.value = settings.background
  else input.checked = settings[key]
  input.addEventListener('input', () => {
    if (key === 'background') settings.background = input.value
    else settings[key] = input.checked
    update()
    let saved = false
    try { saved = saveSettings(window.localStorage, settings) } catch { /* Storage may be disabled. */ }
    document.querySelector('#save-status')!.textContent = saved
      ? 'Saved on this device.' : 'Settings work for this visit; device storage is unavailable.'
  })
}

const recordButton = document.querySelector<HTMLButtonElement>('#record')!
recordButton.disabled = !!replayUrl
function stopRecording() {
  if (!recording) return
  recording.endFrame = loop.frame
  if (recording.endFrame > 0) recording.captureFrames.push(recording.endFrame)
  const url = URL.createObjectURL(new Blob([JSON.stringify(recording, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'drift.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  recording = undefined
  recordButton.textContent = 'Record'
}
recordButton.addEventListener('click', () => {
  if (recording) { stopRecording(); return }
  state = initialState()
  held.clear()
  loop = newLiveLoop()
  recording = createReplay(Math.min(window.innerWidth, MAX_WIDTH), Math.min(window.innerHeight, MAX_HEIGHT))
  recordButton.textContent = 'Stop'
  draw()
})
function clearHeld() {
  for (const action of held) setAction(held, action, false, loop.frame, recording)
}
for (const type of ['keydown', 'keyup'] as const) {
  document.addEventListener(type, (event) => {
    if (replayUrl || viewer.hidden || !(event.code in actionMap)) return
    if (event.target instanceof HTMLInputElement) return
    event.preventDefault()
    setAction(held, actionMap[event.code as keyof typeof actionMap], type === 'keydown', loop.frame, recording)
  })
}
window.addEventListener('blur', () => { clearHeld(); loop.resetClock() })
document.addEventListener('visibilitychange', () => { clearHeld(); loop.resetClock() })

if (replayUrl) {
  void (async () => {
    const response = await fetch(replayUrl)
    if (!response.ok) throw new Error(`Replay request failed: ${response.status}`)
    playback = createPlayback(parseReplay(await response.text()))
    startViewer()
    if (!renderer) throw new Error('WebGL scene unavailable')
    const advance = () => { playback!.advance(); draw() }
    window.__replay = {
      ready: true,
      get frame() { return playback!.frame },
      get position() { return { ...playback!.state.position } },
      advance,
    }
    draw()
  })().catch((error: unknown) => {
    welcome.hidden = true
    viewer.hidden = false
    const message = document.querySelector<HTMLElement>('#error')!
    message.textContent = error instanceof Error ? error.message : 'Replay failed'
    message.hidden = false
  })
}
