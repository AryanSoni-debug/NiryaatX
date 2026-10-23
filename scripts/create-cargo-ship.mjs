import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import * as THREE from 'three'

const materials = [
  ['deep-navy-hull', '#10273b', 0.62, 0.34],
  ['anti-fouling-red', '#793f3b', 0.35, 0.56],
  ['upper-hull-white', '#d9e0df', 0.18, 0.38],
  ['deck-steel', '#53636b', 0.42, 0.58],
  ['deck-white', '#dce2df', 0.15, 0.48],
  ['container-navy', '#344e60', 0.25, 0.62],
  ['container-slate', '#657178', 0.2, 0.68],
  ['container-rust', '#854a40', 0.16, 0.7],
  ['container-orange', '#aa6545', 0.14, 0.69],
  ['bridge-glass', '#193c50', 0.48, 0.2],
  ['safety-gold', '#bf9859', 0.35, 0.48],
  ['equipment-dark', '#2b353a', 0.58, 0.48],
  ['lifeboat-orange', '#c87949', 0.12, 0.7],
  ['warm-light', '#e4c486', 0.12, 0.34],
]
const atlasSize = 512

const parts = new Map()
const materialIndex = new Map(materials.map(([name], index) => [name, index]))
function bucket(partName, materialName) {
  if (!parts.has(partName)) parts.set(partName, new Map())
  const part = parts.get(partName)
  if (!part.has(materialName)) part.set(materialName, [])
  return part.get(materialName)
}

function addGeometry(partName, materialName, geometry, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  geometry.computeVertexNormals()
  const object = new THREE.Mesh(geometry)
  object.position.set(...position)
  object.rotation.set(...rotation)
  object.scale.set(...scale)
  object.updateMatrix()
  const transformed = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  transformed.applyMatrix4(object.matrix)
  const positions = transformed.getAttribute('position')
  const normals = transformed.getAttribute('normal')
  const output = bucket(partName, materialName)
  for (let index = 0; index < positions.count; index += 1) {
    output.push(
      positions.getX(index), positions.getY(index), positions.getZ(index),
      normals.getX(index), normals.getY(index), normals.getZ(index),
    )
  }
  geometry.dispose()
  transformed.dispose()
}

function box(part, material, position, size, rotation = [0, 0, 0]) {
  addGeometry(part, material, new THREE.BoxGeometry(...size), position, rotation)
}

function cylinder(part, material, position, radiusTop, radiusBottom, height, radialSegments = 12, rotation = [0, 0, 0]) {
  addGeometry(part, material, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), position, rotation)
}

function rod(part, material, start, end, radius = 0.025, segments = 8) {
  const a = new THREE.Vector3(...start)
  const b = new THREE.Vector3(...end)
  const delta = new THREE.Vector3().subVectors(b, a)
  const center = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
  const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), segments)
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())
  const object = new THREE.Mesh(geometry)
  object.position.copy(center)
  object.quaternion.copy(quaternion)
  object.updateMatrix()
  geometry.computeVertexNormals()
  const transformed = geometry.toNonIndexed()
  transformed.applyMatrix4(object.matrix)
  const positions = transformed.getAttribute('position')
  const normals = transformed.getAttribute('normal')
  const output = bucket(part, material)
  for (let index = 0; index < positions.count; index += 1) {
    output.push(positions.getX(index), positions.getY(index), positions.getZ(index),
      normals.getX(index), normals.getY(index), normals.getZ(index))
  }
  geometry.dispose()
  transformed.dispose()
}

function hullSection(x, beam, keelY = 0.35, deckY = 2.55) {
  return [
    [x, deckY, -beam],
    [x, keelY + 0.46, -beam * 0.96],
    [x, keelY + 0.17, -beam * 0.75],
    [x, keelY, -beam * 0.34],
    [x, keelY, beam * 0.34],
    [x, keelY + 0.17, beam * 0.75],
    [x, keelY + 0.46, beam * 0.96],
    [x, deckY, beam],
  ]
}

function addHullFace(material, a, b, c, d) {
  const positions = bucket('Hull shell', material)
  for (const point of [a, b, c, a, c, d]) positions.push(...point, 0, 0, 0)
}

function createHull() {
  const stations = [
    [-11, 0.12, 0.48], [-10.5, 0.8, 0.42], [-9.3, 1.47, 0.36],
    [-7.7, 1.88, 0.34], [-4, 2.02, 0.32], [2.5, 2.03, 0.32],
    [6.5, 1.94, 0.35], [8.5, 1.63, 0.39], [10, 1.05, 0.45], [11, 0.18, 0.5],
  ].map(([x, width, keel]) => hullSection(x, width, keel))
  for (let station = 0; station < stations.length - 1; station += 1) {
    const current = stations[station]
    const next = stations[station + 1]
    for (let edge = 0; edge < current.length - 1; edge += 1) {
      const midpointY = (current[edge][1] + next[edge][1] + current[edge + 1][1] + next[edge + 1][1]) / 4
      const material = midpointY < 0.88 ? 'anti-fouling-red' : midpointY < 1.68 ? 'deep-navy-hull' : 'upper-hull-white'
      addHullFace(material, current[edge], current[edge + 1], next[edge + 1], next[edge])
    }
    addHullFace('deck-white', current[0], current[7], next[7], next[0])
  }
}

function createDeck() {
  box('Deck & cargo fittings', 'deck-steel', [0, 2.48, 0], [16.3, 0.16, 3.56])
  box('Deck & cargo fittings', 'deck-white', [-8.38, 2.58, 0], [4.35, 0.22, 3.18])
  box('Deck & cargo fittings', 'deck-white', [8.55, 2.58, 0], [4.45, 0.22, 3.05])
  box('Deck & cargo fittings', 'deck-steel', [0.25, 2.59, 0], [12.4, 0.1, 3.36])

  for (let x = -6.2; x <= 6.3; x += 1.2) {
    box('Deck & cargo fittings', 'equipment-dark', [x, 2.69, -1.58], [0.14, 0.11, 0.1])
    box('Deck & cargo fittings', 'equipment-dark', [x, 2.69, 1.58], [0.14, 0.11, 0.1])
  }
  for (const side of [-1, 1]) {
    for (let index = 0; index <= 28; index += 1) {
      const x = -9.3 + index * 0.66
      const beam = x < -8 ? 1.4 : x > 8 ? 1.4 : 1.8
      rod('Deck railings & safety', 'safety-gold', [x, 2.83, side * beam], [x, 3.06, side * beam], 0.016, 5)
      if (index < 28) {
        const nextX = x + 0.66
        rod('Deck railings & safety', 'deck-white', [x, 3.05, side * beam], [nextX, 3.05, side * beam], 0.012, 5)
        if (index % 2 === 0) {
          rod('Deck railings & safety', 'deck-white', [x, 2.92, side * beam], [nextX, 2.92, side * beam], 0.009, 5)
        }
      }
    }
  }
}

function createBowAndStern() {
  const anchorSide = [-1, 1]
  for (const side of anchorSide) {
    const anchorGeo = new THREE.TorusGeometry(0.18, 0.045, 8, 14)
    addGeometry('Bow, stern & mooring', 'equipment-dark', anchorGeo, [9.75, 1.62, side * 0.77], [Math.PI / 2, 0, 0])
    rod('Bow, stern & mooring', 'equipment-dark', [9.75, 1.55, side * 0.8], [8.95, 0.73, side * 1.18], 0.032, 7)
    box('Bow, stern & mooring', 'equipment-dark', [8.76, 2.78, side * 1.2], [0.34, 0.15, 0.22])
  }
  const bulb = new THREE.SphereGeometry(0.64, 24, 16)
  addGeometry('Bow, stern & mooring', 'anti-fouling-red', bulb, [10.45, 0.55, 0], [0, 0, Math.PI / 12], [1.2, 0.45, 0.66])
  box('Bow, stern & mooring', 'deep-navy-hull', [-10.72, 1.55, 0], [0.55, 1.22, 1.1])
  box('Bow, stern & mooring', 'equipment-dark', [-10.92, 2.02, 0], [0.22, 0.1, 1.52])
  box('Bow, stern & mooring', 'deck-white', [-10.45, 2.74, 0], [0.42, 0.18, 2.1])
  box('Bow, stern & mooring', 'equipment-dark', [-10.2, 2.79, 0], [0.38, 0.16, 1.6])
  for (let side of [-1, 1]) {
    cylinder('Propulsion & rudder', 'equipment-dark', [-10.45, 0.62, side * 0.82], 0.09, 0.12, 1.45, 10, [Math.PI / 2, 0, 0])
    cylinder('Propulsion & rudder', 'safety-gold', [-10.45, 0.62, side * 1.53], 0.24, 0.24, 0.08, 5, [Math.PI / 2, 0, 0])
    for (let blade = 0; blade < 4; blade += 1) {
      const angle = (Math.PI * 2 * blade) / 4
      box('Propulsion & rudder', 'safety-gold', [
        -10.45 + Math.cos(angle) * 0.22, 0.62 + Math.sin(angle) * 0.22, side * 1.53,
      ], [0.34, 0.11, 0.055], [0, 0, angle])
    }
  }
  box('Propulsion & rudder', 'equipment-dark', [-10.75, 0.94, 0], [0.15, 1.5, 0.65])
  for (const x of [-9.3, -8.45, 8.15, 9.05]) {
    for (const side of [-1, 1]) {
      box('Bow, stern & mooring', 'equipment-dark', [x, 2.79, side * 1.28], [0.24, 0.14, 0.12])
      const coil = new THREE.TorusGeometry(0.09, 0.028, 6, 12)
      addGeometry('Bow, stern & mooring', 'safety-gold', coil, [x, 2.89, side * 1.25])
    }
  }
  for (let index = 0; index < 6; index += 1) {
    const x = 8.6 + index * 0.38
    rod('Bow, stern & mooring', 'equipment-dark', [x, 2.73, -0.58], [x, 2.73, 0.58], 0.035, 6)
    cylinder('Bow, stern & mooring', 'safety-gold', [x, 2.88, 0], 0.08, 0.08, 0.14, 8)
  }
}

function createContainers() {
  const colors = ['container-navy', 'container-slate', 'container-rust', 'container-orange']
  let seed = 90417
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const xPositions = Array.from({ length: 15 }, (_, index) => -6.3 + index * 0.9)
  for (const x of xPositions) {
    const edge = Math.abs(x) > 5.5
    for (let row = 0; row < 4; row += 1) {
      for (let level = 0; level < 4; level += 1) {
        if (edge && level > 2) continue
        if (Math.abs(x) < 0.8 && row > 1 && level > 1) continue
        const z = -1.28 + row * 0.85
        const y = 3.16 + level * 0.9
        const color = colors[Math.floor(random() * colors.length)]
        box('Container stacks', color, [x, y, z], [0.86, 0.82, 0.78])
        for (let rib = 0; rib < 7; rib += 1) {
          const ribX = x - 0.35 + rib * 0.117
          for (const side of [-1, 1]) {
            box('Container corrugation', color, [ribX, y, z + side * 0.397], [0.018, 0.71, 0.018])
          }
        }
        for (const end of [-1, 1]) {
          box('Container fittings', 'equipment-dark', [x + end * 0.416, y, z], [0.018, 0.79, 0.73])
          for (const side of [-1, 1]) {
            box('Container fittings', 'safety-gold', [x + end * 0.43, y + 0.35, z + side * 0.31], [0.036, 0.06, 0.06])
          }
        }
      }
    }
  }
}

function createBridge() {
  box('Aft bridge & accommodation', 'deck-white', [-8.28, 3.08, 0], [3.2, 0.88, 2.65])
  box('Aft bridge & accommodation', 'deck-white', [-8.38, 3.64, 0], [2.62, 0.46, 2.38])
  box('Aft bridge & accommodation', 'deck-white', [-8.42, 4.02, 0], [2.06, 0.32, 2.14])
  box('Aft bridge & accommodation', 'bridge-glass', [-8.4, 4.2, 0], [1.92, 0.27, 2.18])
  box('Aft bridge & accommodation', 'deck-white', [-8.42, 4.38, 0], [2.18, 0.13, 2.36])

  for (let index = 0; index < 11; index += 1) {
    const z = -0.91 + index * 0.182
    box('Bridge glazing & navigation', 'equipment-dark', [-8.4, 4.2, z], [1.97, 0.045, 0.022])
    box('Bridge glazing & navigation', 'warm-light', [-7.39, 3.98, z], [0.015, 0.11, 0.08])
    box('Bridge glazing & navigation', 'warm-light', [-8.4, 3.58, z], [0.015, 0.1, 0.075])
  }
  box('Aft bridge & accommodation', 'deck-white', [-8.15, 4.57, 0], [0.88, 0.24, 0.92])
  box('Bridge glazing & navigation', 'equipment-dark', [-8.13, 4.7, 0], [0.18, 0.035, 0.24])
  cylinder('Bridge glazing & navigation', 'deck-white', [-8.55, 4.84, 0], 0.48, 0.48, 0.11, 14)
  cylinder('Bridge glazing & navigation', 'equipment-dark', [-8.55, 4.91, 0], 0.13, 0.13, 0.12, 12)

  for (const side of [-1, 1]) {
    for (let level = 0; level < 3; level += 1) {
      const x = -9.2 + level * 0.1
      const y = 3.18 + level * 0.28
      box('Aft bridge & accommodation', 'lifeboat-orange', [x, y, side * 1.48], [0.88, 0.32, 0.42])
      box('Aft bridge & accommodation', 'deck-white', [x, y + 0.17, side * 1.48], [0.92, 0.055, 0.46])
      for (let support = 0; support < 2; support += 1) {
        rod('Deck railings & safety', 'equipment-dark', [x - 0.32 + support * 0.64, y - 0.05, side * 1.48], [x - 0.32 + support * 0.64, y - 0.35, side * 1.23], 0.017, 6)
      }
    }
  }

  for (let level = 0; level < 3; level += 1) {
    const y = 2.99 + level * 0.28
    box('Bridge glazing & navigation', 'warm-light', [-8.42, y, 1.336], [0.21, 0.08, 0.018])
    box('Bridge glazing & navigation', 'warm-light', [-8.42, y, -1.336], [0.21, 0.08, 0.018])
  }
}

function createNavigationAndMast() {
  cylinder('Funnels, masts & vents', 'deck-white', [-7.1, 3.16, 0], 0.34, 0.41, 0.38, 16)
  cylinder('Funnels, masts & vents', 'equipment-dark', [-7.1, 3.37, 0], 0.28, 0.31, 0.1, 16)
  cylinder('Funnels, masts & vents', 'deck-white', [-7.1, 3.57, 0], 0.12, 0.14, 0.32, 12)
  for (const side of [-1, 1]) {
    const x = -9.55
    rod('Funnels, masts & vents', 'deck-white', [x, 2.9, side * 0.67], [x, 7.5, side * 0.67], 0.038, 8)
    rod('Funnels, masts & vents', 'deck-white', [x, 6.55, side * 0.67], [x + 0.92, 6.55, side * 0.67], 0.025, 7)
    rod('Funnels, masts & vents', 'deck-white', [x, 5.7, side * 0.67], [x + 0.62, 6.55, side * 0.67], 0.018, 6)
    rod('Funnels, masts & vents', 'deck-white', [x, 6.55, side * 0.67], [x - 0.6, 7.36, side * 0.67], 0.018, 6)
    box('Bridge glazing & navigation', 'warm-light', [x, 7.43, side * 0.67], [0.12, 0.14, 0.12])
  }
  rod('Funnels, masts & vents', 'deck-white', [-8.37, 4.35, -0.96], [-8.37, 5.38, -0.96], 0.026, 7)
  rod('Funnels, masts & vents', 'deck-white', [-8.37, 5.15, -0.96], [-7.92, 5.15, -0.96], 0.02, 6)
  cylinder('Bridge glazing & navigation', 'deck-white', [-8.35, 5.13, 0.92], 0.12, 0.12, 0.11, 12, [Math.PI / 2, 0, 0])
  for (let index = 0; index < 8; index += 1) {
    cylinder('Funnels, masts & vents', 'equipment-dark', [-6.5 + index * 0.43, 2.95, 0], 0.11, 0.16, 0.34, 10)
  }

  for (const side of [-1, 1]) {
    for (let step = 0; step < 8; step += 1) {
      box('Deck railings & safety', 'safety-gold', [-9.65 + step * 0.24, 3.1, side * (1.05 - step * 0.025)], [0.08, 0.035, 0.035])
    }
    for (let level = 0; level < 9; level += 1) {
      rod('Deck railings & safety', 'safety-gold', [-7.82, 2.9 + level * 0.16, side * 1.37], [-7.5, 2.9 + level * 0.16, side * 1.37], 0.013, 5)
    }
    rod('Deck railings & safety', 'safety-gold', [-7.82, 2.88, side * 1.37], [-7.82, 4.23, side * 1.37], 0.014, 5)
    rod('Deck railings & safety', 'safety-gold', [-7.5, 2.88, side * 1.37], [-7.5, 4.23, side * 1.37], 0.014, 5)
  }
}

function createShipLights() {
  for (let index = 0; index < 34; index += 1) {
    const x = -7.65 + (index % 17) * 0.42
    const level = Math.floor(index / 17)
    for (const side of [-1, 1]) {
      box('Accommodation windows', 'warm-light', [x, 3.04 + level * 0.42, side * 1.335], [0.1, 0.08, 0.018])
    }
  }
  for (let index = 0; index < 5; index += 1) {
    box('Deck & cargo fittings', 'safety-gold', [7.5 + index * 0.45, 2.7, 0], [0.25, 0.035, 0.045])
  }
}

createHull()
createDeck()
createBowAndStern()
createContainers()
createBridge()
createNavigationAndMast()
createShipLights()

const binChunks = []
const bufferViews = []
const accessors = []
const gltfMeshes = []
const gltfNodes = []
let byteOffset = 0
function addAccessor(array, type, componentType, count, target, min, max) {
  const padding = (4 - (byteOffset % 4)) % 4
  if (padding) {
    binChunks.push(Buffer.alloc(padding))
    byteOffset += padding
  }
  const buffer = Buffer.alloc(array.length * 4)
  for (let index = 0; index < array.length; index += 1) buffer.writeFloatLE(array[index], index * 4)
  const view = bufferViews.push({ buffer: 0, byteOffset, byteLength: buffer.length, target }) - 1
  byteOffset += buffer.length
  binChunks.push(buffer)
  const accessor = { bufferView: view, componentType, count, type }
  if (min) accessor.min = min
  if (max) accessor.max = max
  accessors.push(accessor)
  return accessors.length - 1
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(name, data) {
  const type = Buffer.from(name)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])))
  return Buffer.concat([length, type, data, checksum])
}

function createWearAtlas() {
  const size = atlasSize
  const tile = size / 4
  const rows = []
  let seed = 30017
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4)
    for (let x = 0; x < size; x += 1) {
      seed = (seed * 16807) % 2147483647
      const noise = ((seed % 17) - 8)
      const material = Math.floor(y / tile) * 4 + Math.floor(x / tile)
      const localX = x % tile
      const corrugation = material >= 5 && material <= 8 && localX % 13 < 2 ? -11 : 0
      const edgeWear = (localX < 2 || localX > tile - 3 || y % tile < 2 || y % tile > tile - 3) ? -9 : 0
      const value = Math.max(218, Math.min(255, 245 + noise + corrugation + edgeWear))
      const offset = 1 + x * 4
      row[offset] = value
      row[offset + 1] = value
      row[offset + 2] = value
      row[offset + 3] = 255
    }
    rows.push(row)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  const image = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
  return image
}

for (const [partName, materialBuckets] of parts) {
  const primitives = []
  for (const [materialName, packed] of materialBuckets) {
    const positions = []
    const normals = []
    for (let index = 0; index < packed.length; index += 6) {
      positions.push(packed[index], packed[index + 1], packed[index + 2])
      normals.push(packed[index + 3], packed[index + 4], packed[index + 5])
    }
    for (let index = 0; index < positions.length; index += 9) {
      const normalOffset = (index / 3) * 3
      const existingNormal = new THREE.Vector3(normals[normalOffset], normals[normalOffset + 1], normals[normalOffset + 2])
      if (existingNormal.lengthSq() < 0.5) {
        const a = new THREE.Vector3(...positions.slice(index, index + 3))
        const b = new THREE.Vector3(...positions.slice(index + 3, index + 6))
        const c = new THREE.Vector3(...positions.slice(index + 6, index + 9))
        const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize()
        for (let vertex = 0; vertex < 3; vertex += 1) normals.splice(index / 3 * 3 + vertex * 3, 3, normal.x, normal.y, normal.z)
      }
    }
    const min = [Infinity, Infinity, Infinity]
    const max = [-Infinity, -Infinity, -Infinity]
    for (let index = 0; index < positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], positions[index + axis])
        max[axis] = Math.max(max[axis], positions[index + axis])
      }
    }
    const positionAccessor = addAccessor(positions, 'VEC3', 5126, positions.length / 3, 34962, min, max)
    const normalAccessor = addAccessor(normals, 'VEC3', 5126, normals.length / 3, 34962)
    const material = materialIndex.get(materialName)
    const tileX = material % 4
    const tileY = Math.floor(material / 4)
    const fract = (value) => ((value % 1) + 1) % 1
    const uv = []
    for (let index = 0; index < positions.length; index += 3) {
      const x = positions[index]
      const y = positions[index + 1]
      const z = positions[index + 2]
      uv.push(
        (tileX * 128 + 2 + fract(x * 0.17 + z * 0.29) * 124) / atlasSize,
        (tileY * 128 + 2 + fract(y * 0.15 + x * 0.08) * 124) / atlasSize,
      )
    }
    const uvAccessor = addAccessor(uv, 'VEC2', 5126, uv.length / 2, 34962)
    primitives.push({ attributes: { POSITION: positionAccessor, NORMAL: normalAccessor, TEXCOORD_0: uvAccessor }, material, mode: 4 })
  }
  const mesh = gltfMeshes.push({ name: partName, primitives }) - 1
  gltfNodes.push({ name: partName, mesh })
}

const meshBinary = Buffer.concat(binChunks)
const imageBytes = createWearAtlas()
const imagePadding = (4 - (meshBinary.length % 4)) % 4
const binary = Buffer.concat([meshBinary, Buffer.alloc(imagePadding), imageBytes])
bufferViews.push({ buffer: 0, byteOffset: meshBinary.length + imagePadding, byteLength: imageBytes.length })
const gltf = {
  asset: { version: '2.0', generator: 'NiryaatX Original Cargo Vessel Builder' },
  scene: 0,
  scenes: [{ name: 'Standalone cargo vessel', nodes: [0] }],
  nodes: [{ name: 'NX Meridian — original container vessel', children: gltfNodes.map((_, index) => index + 1) }, ...gltfNodes],
  meshes: gltfMeshes,
  materials: materials.map(([name, color, metallicFactor, roughnessFactor]) => ({
    name,
    pbrMetallicRoughness: {
      baseColorFactor: [Number.parseInt(color.slice(1, 3), 16) / 255, Number.parseInt(color.slice(3, 5), 16) / 255, Number.parseInt(color.slice(5, 7), 16) / 255, 1],
      baseColorTexture: { index: 0 },
      metallicFactor,
      roughnessFactor,
    },
    doubleSided: true,
  })),
  textures: [{ sampler: 0, source: 0 }],
  images: [{ name: 'Subtle painted steel wear atlas', bufferView: bufferViews.length - 1, mimeType: 'image/png' }],
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  buffers: [{ byteLength: binary.length }],
  bufferViews,
  accessors,
}
const jsonChunk = Buffer.from(JSON.stringify(gltf))
const jsonPadding = (4 - (jsonChunk.length % 4)) % 4
const paddedJson = Buffer.concat([jsonChunk, Buffer.alloc(jsonPadding, 0x20)])
const binaryPadding = (4 - (binary.length % 4)) % 4
const paddedBinary = binaryPadding ? Buffer.concat([binary, Buffer.alloc(binaryPadding)]) : binary
const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBinary.length
const header = Buffer.alloc(12)
header.writeUInt32LE(0x46546c67, 0)
header.writeUInt32LE(2, 4)
header.writeUInt32LE(totalLength, 8)
const jsonHeader = Buffer.alloc(8)
jsonHeader.writeUInt32LE(paddedJson.length, 0)
jsonHeader.writeUInt32LE(0x4e4f534a, 4)
const binaryHeader = Buffer.alloc(8)
binaryHeader.writeUInt32LE(paddedBinary.length, 0)
binaryHeader.writeUInt32LE(0x004e4942, 4)
const output = new URL('../public/models/niryaatx-container-ship.glb', import.meta.url)
await mkdir(new URL('../public/models/', import.meta.url), { recursive: true })
await writeFile(output, Buffer.concat([header, jsonHeader, paddedJson, binaryHeader, paddedBinary]))

const triangles = [...parts.values()].flatMap((materials) => [...materials.values()])
  .reduce((sum, vertices) => sum + vertices.length / 6 / 3, 0)
console.log(`Wrote ${output.pathname}`)
console.log(`Triangle count: ${triangles.toLocaleString()}`)
console.log(`GLB size: ${(totalLength / 1024 / 1024).toFixed(2)} MiB`)
