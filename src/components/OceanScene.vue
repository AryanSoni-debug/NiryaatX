<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const canvas = ref(null)
let renderer
let scene
let camera
let ship
let shipBaseX = 0
let frame
let resizeObserver
const pointer = { x: 0, y: 0 }
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function makeShip() {
  const group = new THREE.Group()
  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 1.2, 7.4, 12, 1, false),
    new THREE.MeshStandardMaterial({ color: '#07101b', metalness: 0.38, roughness: 0.48 }),
  )
  hull.rotation.z = Math.PI / 2
  hull.position.y = 0.45
  hull.scale.set(1, 0.48, 1)
  group.add(hull)
  const deckMat = new THREE.MeshStandardMaterial({ color: '#d7d8d4', roughness: 0.82 })
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.62, 1.32), deckMat)
  deck.position.set(-0.1, 1.05, 0)
  group.add(deck)
  for (let level = 0; level < 3; level += 1) {
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(4.15 - level * 0.46, 0.36, 1.05 - level * 0.1),
      new THREE.MeshStandardMaterial({ color: level === 0 ? '#b8c1c3' : '#e3e1d8', roughness: 0.8 }),
    )
    cabin.position.set(-0.28, 1.52 + level * 0.37, 0)
    group.add(cabin)
  }
  for (let i = 0; i < 4; i += 1) {
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.86, 12),
      new THREE.MeshStandardMaterial({ color: '#c5ad83', roughness: 0.68 }),
    )
    stack.position.set(1.55 - i * 0.96, 2.52, 0)
    group.add(stack)
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: '#171c20', roughness: 0.62 }),
    )
    cap.position.set(1.55 - i * 0.96, 3, 0)
    group.add(cap)
  }
  const windowMaterial = new THREE.MeshBasicMaterial({ color: '#f2c77b' })
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < 16; i += 1) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.045, 0.015), windowMaterial)
      light.position.set(-2.34 + i * 0.3, 1.39 + row * 0.37, 0.67)
      group.add(light)
    }
  }
  for (let i = 0; i < 9; i += 1) {
    const boat = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.11, 0.14),
      new THREE.MeshStandardMaterial({ color: '#d9d1be', roughness: 0.8 }),
    )
    boat.position.set(-2 + i * 0.5, 1.68, 0.72)
    group.add(boat)
  }
  return group
}

function onPointerMove(event) {
  const bounds = canvas.value?.getBoundingClientRect()
  if (!bounds) return
  pointer.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2))
  pointer.y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2))
}

function render() {
  if (!reducedMotion) frame = requestAnimationFrame(render)
  const progress = Math.min(1, window.scrollY / Math.max(1, canvas.value?.clientHeight ?? window.innerHeight))
  if (ship) {
    ship.position.y = Math.sin(performance.now() * 0.00045) * 0.035 + progress * 0.42
    ship.rotation.z = Math.sin(performance.now() * 0.00024) * 0.006
    ship.rotation.y = -0.34 + progress * 0.2 + pointer.x * 0.045
    ship.position.x = shipBaseX + progress * 1.1
  }
  if (camera) {
    const cameraDistance = window.innerWidth < 980 ? 19 : 15
    camera.position.x += (pointer.x * 0.28 - camera.position.x) * 0.018
    camera.position.y += (3.55 - pointer.y * 0.18 - camera.position.y) * 0.018
    camera.position.z += (cameraDistance - progress * 0.7 - camera.position.z) * 0.018
    camera.lookAt(0, 1, 0)
  }
  renderer?.render(scene, camera)
}

onMounted(() => {
  if (reducedMotion || window.innerWidth < 600) {
    canvas.value?.classList.add('scene-fallback')
    return
  }
  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color('#071b2d')
    scene.fog = new THREE.FogExp2('#071b2d', 0.032)
    const bounds = canvas.value.getBoundingClientRect()
    camera = new THREE.PerspectiveCamera(37, bounds.width / bounds.height, 0.1, 100)
    camera.position.set(0, 3.55, 15)
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, alpha: false, antialias: window.innerWidth > 700 })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.setSize(bounds.width, bounds.height, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    scene.add(new THREE.HemisphereLight('#b4d6e7', '#071324', 2.0))
    const moon = new THREE.DirectionalLight('#d1e7f2', 2.2)
    moon.position.set(-4, 8, 5)
    scene.add(moon)
    const warm = new THREE.PointLight('#eab96f', 25, 12)
    warm.position.set(0, 3, 0)
    scene.add(warm)
    ship = makeShip()
    ship.rotation.y = -0.34
    scene.add(ship)
    new GLTFLoader().load(
      '/models/niryaatx-container-ship.glb',
      (gltf) => {
        const model = gltf.scene
        model.name = 'NiryaatX original container vessel'
        model.scale.setScalar(0.36)
        model.position.set(0, -0.3, 0)
        model.rotation.y = -0.34
        scene.remove(ship)
        ship.traverse((object) => {
          if (object.isMesh) {
            object.geometry.dispose()
            if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
            else object.material.dispose()
          }
        })
        ship = model
        shipBaseX = 0
        scene.add(ship)
      },
      undefined,
      (error) => console.error('Unable to load the cargo vessel model; using the procedural fallback.', error),
    )

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150, 1, 1),
      new THREE.MeshStandardMaterial({ color: '#092842', metalness: 0.45, roughness: 0.26 }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.y = -0.1
    scene.add(water)
    const horizon = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 25),
      new THREE.MeshBasicMaterial({ color: '#102d40', transparent: true, opacity: 0.28 }),
    )
    horizon.position.set(0, 2, -17)
    scene.add(horizon)

    for (let i = 0; i < 90; i += 1) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.014 + Math.random() * 0.018, 5, 5),
        new THREE.MeshBasicMaterial({ color: i % 5 === 0 ? '#ddc58d' : '#a3c4d2', transparent: true, opacity: 0.55 }),
      )
      star.position.set((Math.random() - 0.5) * 48, 4 + Math.random() * 15, -8 - Math.random() * 24)
      scene.add(star)
    }
    const onResize = () => {
      const bounds = canvas.value.getBoundingClientRect()
      camera.aspect = bounds.width / bounds.height
      camera.position.z = window.innerWidth < 980 ? 19 : 15
      camera.updateProjectionMatrix()
      renderer.setSize(bounds.width, bounds.height, false)
    }
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(canvas.value)
    if (!reducedMotion) window.addEventListener('pointermove', onPointerMove)
    render()
  } catch (error) {
    console.error('Unable to initialise the ocean scene.', error)
    canvas.value?.classList.add('scene-fallback')
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  renderer?.dispose()
  scene?.traverse((object) => {
    if (object.isMesh) {
      object.geometry.dispose()
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
      else object.material.dispose()
    }
  })
})
</script>

<template>
  <canvas ref="canvas" class="ocean-canvas" aria-hidden="true"></canvas>
  <div class="static-liner" aria-hidden="true">
    <i class="liner-hull"></i><i class="liner-deck lower"></i><i class="liner-deck upper"></i>
    <i class="liner-stack stack-one"></i><i class="liner-stack stack-two"></i><i class="liner-stack stack-three"></i><i class="liner-stack stack-four"></i>
  </div>
</template>
