import { describe, expect, it } from 'vitest'
import { Box3, Color, Fog, Mesh, PlaneGeometry } from 'three'
import { buildScene, applySceneSettings } from './scene'

describe('scene construction without WebGL', () => {
  it('places three shadow-casting primitives on a receiving ground plane', () => {
    const { scene, shapes, sun } = buildScene()
    expect(shapes.children).toHaveLength(3)
    for (const shape of shapes.children) {
      expect(shape).toBeInstanceOf(Mesh)
      expect((shape as Mesh).castShadow).toBe(true)
      expect(new Box3().setFromObject(shape).min.y).toBeCloseTo(0)
    }
    const ground = scene.children.find((child) => child instanceof Mesh && child.geometry instanceof PlaneGeometry)
    expect(ground?.receiveShadow).toBe(true)
    expect(sun.castShadow).toBe(true)
    expect(sun.position.y).toBeGreaterThan(0)
  })
  it('applies background, fog and grid preferences without moving shapes', () => {
    const { scene, grid, shapes } = buildScene()
    const positions = shapes.children.map((shape) => shape.position.clone())
    applySceneSettings(scene, grid, { background: '#123456', shadows: true, grid: false })
    expect((scene.background as Color).getHexString()).toBe('123456')
    expect((scene.fog as Fog).color.getHexString()).toBe('123456')
    expect(grid.visible).toBe(false)
    applySceneSettings(scene, grid, { background: '#ffffff', shadows: false, grid: true })
    expect(grid.visible).toBe(true)
    expect(shapes.children.map((shape) => shape.position)).toEqual(positions)
  })
})
