import * as THREE from 'three'
import type { Settings } from './settings'

export function buildScene() {
  const scene = new THREE.Scene()
  const shapes = new THREE.Group()
  const definitions = [
    { geometry: new THREE.BoxGeometry(1.5, 1.5, 1.5), color: '#cc7357', x: -2.2, y: 0.75 },
    { geometry: new THREE.SphereGeometry(0.95, 48, 32), color: '#538e92', x: 0, y: 0.95 },
    { geometry: new THREE.ConeGeometry(0.9, 2, 48), color: '#d6b76b', x: 2.2, y: 1 },
  ]
  for (const { geometry, color, x, y } of definitions) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.55 }))
    mesh.position.set(x, y, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    shapes.add(mesh)
  }
  scene.add(shapes)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: '#d5dbe0', roughness: 1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  const grid = new THREE.GridHelper(20, 20, '#82929c', '#b4c0c7')
  grid.position.y = 0.005
  scene.add(grid)
  scene.add(new THREE.HemisphereLight('#ffffff', '#7a808c', 2.5))
  const sun = new THREE.DirectionalLight('#fff3dd', 3)
  sun.position.set(-3, 7, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 25 })
  sun.shadow.normalBias = 0.02
  scene.add(sun)
  scene.fog = new THREE.Fog('#e8edf2', 18, 50)
  return { scene, shapes, grid, sun }
}

export function applySceneSettings(scene: THREE.Scene, grid: THREE.GridHelper, settings: Settings) {
  scene.background = new THREE.Color(settings.background)
  if (scene.fog instanceof THREE.Fog) scene.fog.color.set(settings.background)
  grid.visible = settings.grid
}
