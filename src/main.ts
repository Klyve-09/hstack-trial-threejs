import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildScene, applySceneSettings } from './scene'
import { defaultSettings, loadSettings, saveSettings } from './settings'
import { createSphereDrift } from './drift'
import type { Settings } from './settings'

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
    <header><button id="home" class="brand">Quiet forms<span>.</span></button><button id="settings-toggle" aria-expanded="false" aria-controls="settings">Settings</button></header>
    <p class="hint">Drag to orbit <span>·</span> Scroll to zoom <span>·</span> Right-drag to pan</p>
    <div class="drift-controls" aria-label="Sphere movement">
      <button id="boost" aria-describedby="boost-status">Boost sphere (B)</button>
      <span id="boost-status" role="status">Ready to boost</span>
    </div>
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
const boostButton = document.querySelector<HTMLButtonElement>('#boost')!
const boostStatus = document.querySelector<HTMLElement>('#boost-status')!
const toggle = document.querySelector<HTMLButtonElement>('#settings-toggle')!
let settings: Settings
try { settings = loadSettings(window.localStorage) } catch { settings = { ...defaultSettings } }
let renderer: THREE.WebGLRenderer | undefined
let resize = () => {}
let update = () => {}
let renderFrame = () => {}
let boost = () => {}

function initializeViewer() {
  const nextRenderer = new THREE.WebGLRenderer({ antialias: true })
  renderer = nextRenderer
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.setAttribute('aria-label', 'A terracotta cube, teal sphere, and golden cone on a ground plane')
  renderer.domElement.setAttribute('role', 'img')
  viewport.append(renderer.domElement)
  const { scene, grid, shapes } = buildScene()
  const drift = createSphereDrift(shapes.children[1]!)
  const updateBoostStatus = () => {
    const coolingDown = !drift.ready
    boostButton.disabled = coolingDown
    const text = coolingDown ? 'Recharging…' : 'Ready to boost'
    if (boostStatus.textContent !== text) boostStatus.textContent = text
  }
  boost = () => {
    drift.boost()
    updateBoostStatus()
  }
  updateBoostStatus()
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
  renderFrame = () => {
    drift.advance()
    updateBoostStatus()
    nextRenderer.render(scene, camera)
  }
  renderer.setAnimationLoop(renderFrame)
}

boostButton.addEventListener('click', () => boost())
document.addEventListener('keydown', (event) => {
  if (viewer.hidden || !panel.hidden || event.repeat || event.defaultPrevented) return
  if (event.ctrlKey || event.altKey || event.metaKey || event.key.toLowerCase() !== 'b') return
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return
  event.preventDefault()
  boost()
})

function showPanel(open: boolean) {
  panel.hidden = !open
  toggle.setAttribute('aria-expanded', String(open))
  if (!open) toggle.focus()
}

document.querySelector('#start')!.addEventListener('click', () => {
  welcome.hidden = true
  viewer.hidden = false
  try {
    if (!renderer) initializeViewer()
    else { resize(); renderer.setAnimationLoop(renderFrame) }
    toggle.focus()
  } catch {
    renderer?.dispose()
    renderer = undefined
    const error = document.querySelector<HTMLElement>('#error')!
    error.textContent = 'The 3D scene could not start. Please use a browser with WebGL enabled.'
    error.hidden = false
  }
})
document.querySelector('#home')!.addEventListener('click', () => {
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
