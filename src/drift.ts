import type { Object3D } from 'three'

const COOLDOWN = 120
const BOOST_DURATION = 30
const EDGE = 3

export function createSphereDrift(sphere: Object3D) {
  let direction = 1
  let cooldown = 0
  let boostRemaining = 0
  sphere.position.z = -2.5

  return {
    get ready() { return cooldown === 0 },
    boost() {
      if (cooldown > 0) return
      cooldown = COOLDOWN
      boostRemaining = BOOST_DURATION
    },
    advance() {
      const speed = boostRemaining > 0 ? 0.05 : 0.012
      sphere.position.x += direction * speed
      if (sphere.position.x >= EDGE) {
        sphere.position.x = EDGE
        direction = -1
      } else if (sphere.position.x <= -EDGE) {
        sphere.position.x = -EDGE
        direction = 1
      }
      cooldown = Math.max(0, cooldown - 1)
      boostRemaining = Math.max(0, boostRemaining - 1)
    },
  }
}
