"use client";

import { useEffect, useRef, useState } from "react";

export default function ModelViewer({ src }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);
  const [ready, setReady] = useState(false);

  // ── Init Three.js once ──────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId;

    const init = async () => {
      const [
        THREE,
        { OrbitControls },
      ] = await Promise.all([
        import("three"),
        import("three/examples/jsm/controls/OrbitControls.js"),
      ]);

      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x09090e);
      scene.fog = new THREE.FogExp2(0x09090e, 0.018);

      // Camera
      const camera = new THREE.PerspectiveCamera(42, w / h, 0.01, 200);
      camera.position.set(0, 2.2, 5.5);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.75));

      const hemi = new THREE.HemisphereLight(0xb0a8ff, 0x334466, 0.55);
      scene.add(hemi);

      const sun = new THREE.DirectionalLight(0xffffff, 2.4);
      sun.position.set(5, 10, 6);
      sun.castShadow = true;
      sun.shadow.mapSize.setScalar(2048);
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 40;
      sun.shadow.camera.left = -8;
      sun.shadow.camera.right = 8;
      sun.shadow.camera.top = 8;
      sun.shadow.camera.bottom = -8;
      sun.shadow.bias = -0.001;
      scene.add(sun);

      const fill = new THREE.DirectionalLight(0x8888ff, 0.55);
      fill.position.set(-5, 3, -5);
      scene.add(fill);

      // Grid floor
      const grid = new THREE.GridHelper(60, 60, 0x4433cc, 0x1a1740);
      grid.material.transparent = true;
      grid.material.opacity = 0.88;
      scene.add(grid);

      // Invisible shadow-receiver plane
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 40),
        new THREE.ShadowMaterial({ opacity: 0.5 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.minPolarAngle = Math.PI / 10;
      controls.maxPolarAngle = Math.PI / 2.05;
      controls.minDistance = 1.5;
      controls.maxDistance = 18;
      controls.target.set(0, 1, 0);
      controls.update();

      // Track user interaction so auto-spin pauses while dragging
      let userInteracting = false;
      controls.addEventListener("start", () => { userInteracting = true; });
      controls.addEventListener("end", () => { userInteracting = false; });

      stateRef.current = { THREE, scene, camera, renderer, controls };
      setReady(true);

      // Render loop — rotate only the model, grid stays fixed
      const animate = () => {
        animId = requestAnimationFrame(animate);
        if (!userInteracting) {
          const model = scene.getObjectByName("__model__");
          if (model) model.rotation.y += 0.005;
        }
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Resize
      const onResize = () => {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch);
      };
      window.addEventListener("resize", onResize);
      stateRef.current.onResize = onResize;
    };

    init().catch(console.error);

    return () => {
      cancelAnimationFrame(animId);
      const s = stateRef.current;
      if (!s) return;
      if (s.onResize) window.removeEventListener("resize", s.onResize);
      s.renderer.dispose();
      if (container.contains(s.renderer.domElement)) {
        container.removeChild(s.renderer.domElement);
      }
      stateRef.current = null;
      setReady(false);
    };
  }, []);

  // ── Load / swap model ───────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !ready) return;
    const { THREE, scene, controls } = s;

    // Remove old model
    const old = scene.getObjectByName("__model__");
    if (old) {
      old.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose()
          );
        }
      });
      scene.remove(old);
    }

    if (!src) return;

    let cancelled = false;

    const load = async () => {
      const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/loaders/DRACOLoader.js"),
      ]);

      const draco = new DRACOLoader();
      draco.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
      );

      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);

      loader.load(
        src,
        (gltf) => {
          if (cancelled || !stateRef.current) return;

          const model = gltf.scene;
          model.name = "__model__";

          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const sc = 2 / maxDim;

          model.scale.setScalar(sc);
          model.position.set(
            -center.x * sc,
            -box.min.y * sc, // feet on grid floor
            -center.z * sc
          );

          model.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });

          scene.add(model);
          controls.target.set(0, (size.y * sc) / 2, 0);
          controls.update();
        },
        undefined,
        (err) => console.error("Model load error:", err)
      );
    };

    load().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [src, ready]);

  return (
    <>
      {/* Three.js canvas — always mounted so the grid shows in empty state too */}
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* Placeholder overlay when no model loaded */}
      {!src && (
        <div className="viewer-placeholder">
          <div className="viewer-placeholder-icon">⬡</div>
          <p className="viewer-placeholder-text">
            Your 3D model will appear here once generation is complete.
          </p>
        </div>
      )}
    </>
  );
}
