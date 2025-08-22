import { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'

// Define un tipo para las claves posibles
type GeometryKey =
  | 'sphere'
  | 'plane'
  | 'cone'
  | 'cylinder'
  | 'torus'
  | 'torusKnot'
  | 'icosahedron'
  | 'dodecahedron'

type GeometryDefinition = {
  name: string
  category: string
  description: string
  create: () => THREE.BufferGeometry
  color: string
}

export default function GeometryExplorer() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const currentMeshRef = useRef<THREE.Mesh | null>(null)
  const animRef = useRef<number | null>(null)

  const [wireframe, setWireframe] = useState<boolean>(() => localStorage.getItem("wireframe") === "true")
  const [autoRotate, setAutoRotate] = useState<boolean>(() => localStorage.getItem("autoRotate") !== "false")

  // Usa GeometryKey para el estado
  const [selectedGeometryKey, setSelectedGeometryKey] = useState<GeometryKey>('sphere')

  const wireframeRef = useRef(wireframe)
  const autoRotateRef = useRef(autoRotate)

  useEffect(() => {
    wireframeRef.current = wireframe
    localStorage.setItem("wireframe", String(wireframe))
  }, [wireframe])

  useEffect(() => {
    autoRotateRef.current = autoRotate
    localStorage.setItem("autoRotate", String(autoRotate))
  }, [autoRotate])

  // Tipar geometrías con un Record y el tipo de clave GeometryKey
  const geometries: Record<GeometryKey, GeometryDefinition> = useMemo(() => ({
    sphere: {
      name: 'Sphere',
      category: 'Primitivas',
      description: 'Esfera',
      create: () => new THREE.SphereGeometry(1, 32, 16),
      color: '#FF6B6B',
    },
    plane: {
      name: 'Plane',
      category: 'Primitivas',
      description: 'Plano',
      create: () => new THREE.PlaneGeometry(2, 2),
      color: '#4ECDC4',
    },
    cone: {
      name: 'Cone',
      category: 'Primitivas',
      description: 'Cono',
      create: () => new THREE.ConeGeometry(1, 2, 16),
      color: '#556270',
    },
    cylinder: {
      name: 'Cylinder',
      category: 'Primitivas',
      description: 'Cilindro',
      create: () => new THREE.CylinderGeometry(1, 1, 2, 16),
      color: '#C7F464',
    },
    torus: {
      name: 'Torus',
      category: 'Primitivas',
      description: 'Toro',
      create: () => new THREE.TorusGeometry(1, 0.3, 16, 64),
      color: '#FF6B6B',
    },
    torusKnot: {
      name: 'Torus Knot',
      category: 'Primitivas',
      description: 'Nudo Toroidal',
      create: () => new THREE.TorusKnotGeometry(1, 0.3, 100, 16),
      color: '#6B6BFF',
    },
    icosahedron: {
      name: 'Icosahedron',
      category: 'Primitivas',
      description: 'Icosaedro',
      create: () => new THREE.IcosahedronGeometry(1, 0),
      color: '#FFCA3A',
    },
    dodecahedron: {
      name: 'Dodecahedron',
      category: 'Primitivas',
      description: 'Dodecaedro',
      create: () => new THREE.DodecahedronGeometry(1, 0),
      color: '#1982C4',
    }
  }), [])

  // En los demás usos de geometries, TypeScript ya reconoce las claves y no dará error
  useEffect(() => {
    if (!mountRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    const { width, height } = mountRef.current.getBoundingClientRect()
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(3, 2, 4)
    cameraRef.current = camera

    if (rendererRef.current) {
      rendererRef.current.dispose()
      if (mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement)
      }
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    rendererRef.current = renderer
    mountRef.current.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, 0.35)
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(5, 5, 5)
    scene.add(ambient, dir)

    const geom = geometries[selectedGeometryKey].create()
    const material = new THREE.MeshPhongMaterial({ color: geometries[selectedGeometryKey].color, wireframe: wireframeRef.current })
    const mesh = new THREE.Mesh(geom, material)
    currentMeshRef.current = mesh
    scene.add(mesh)

    const axes = new THREE.AxesHelper(2)
    const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222)
    scene.add(axes, grid)

    const animate = () => {
      animRef.current = requestAnimationFrame(animate)
      if (autoRotateRef.current && currentMeshRef.current) {
        currentMeshRef.current.rotation.x += 0.01
        currentMeshRef.current.rotation.y += 0.015
      }
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!mountRef.current) return
      const rect = mountRef.current.getBoundingClientRect()
      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()
      renderer.setSize(rect.width, rect.height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      renderer.dispose()
      geom.dispose()
      material.dispose()
      scene.clear()
    }
  }, [geometries, selectedGeometryKey])

  useEffect(() => {
    const mesh = currentMeshRef.current
    if (!mesh) return
    const mat = mesh.material as THREE.MeshPhongMaterial
    mat.wireframe = wireframe
    mat.needsUpdate = true
  }, [wireframe])

  const handleGeometryChange = (key: GeometryKey) => {
    if (!currentMeshRef.current) return
    const mesh = currentMeshRef.current

    const newGeom = geometries[key].create()
    mesh.geometry.dispose()
    mesh.geometry = newGeom

    const mat = mesh.material as THREE.MeshPhongMaterial
    mat.color.set(geometries[key].color)

    setSelectedGeometryKey(key)
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', display: 'flex' }}>
      <div style={{ width: 200, background: '#222', color: 'white', padding: 12, overflowY: 'auto' }}>
        <h2>Geometrías</h2>
        {Object.entries(geometries).map(([key, geom]) => (
          // Haz un cast para que TypeScript entienda que key es GeometryKey
          <button
            key={key}
            onClick={() => handleGeometryChange(key as GeometryKey)}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: 8,
              padding: '8px 12px',
              backgroundColor: selectedGeometryKey === key ? geom.color : '#444',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              textAlign: 'left',
              borderRadius: 4,
            }}
            title={geom.description}
          >
            {geom.name}
          </button>
        ))}
      </div>

      <div style={{ flexGrow: 1, position: 'relative' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        <div style={{ position: 'absolute', right: 12, top: 12, display: 'grid', gap: 8 }}>
          <button onClick={() => setAutoRotate(!autoRotate)}>
            {autoRotate ? '⏸️ Pausar Rotación' : '▶️ Reanudar Rotación'}
          </button>
          <button onClick={() => setWireframe(!wireframe)}>
            {wireframe ? '🔲 Sólido' : '🔳 Wireframe'}
          </button>
        </div>
      </div>
    </div>
  )
}
