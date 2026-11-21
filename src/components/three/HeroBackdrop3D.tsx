import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const HeroBackdrop3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070a);
    scene.fog = new THREE.FogExp2(0x06070a, 0.032);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 140);
    camera.position.set(0, 4.2, 13.5);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Three-point warm/cool studio lighting
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x090b12, 0.8);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xff8c42, 2.2);
    keyLight.position.set(8, 12, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x00d2ff, 1.8);
    rimLight.position.set(-9, 6, -7);
    scene.add(rimLight);

    // Reflective cyber arena floor grid
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d14,
      roughness: 0.25,
      metalness: 0.78,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const grid = new THREE.GridHelper(60, 30, 0x00d2ff, 0x182032);
    grid.position.y = 0.02;
    scene.add(grid);

    // Composite central monolith assembly
    const coreGroup = new THREE.Group();
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x161b26,
      roughness: 0.28,
      metalness: 0.88,
    });
    const orangeGlow = new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      emissive: 0xff6b00,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    });
    const blueGlow = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      emissive: 0x00d2ff,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    const basePedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 0.45, 6), darkMetal);
    basePedestal.position.y = 0.225;
    coreGroup.add(basePedestal);

    const innerCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), orangeGlow);
    innerCrystal.position.y = 2.4;
    coreGroup.add(innerCrystal);

    const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.07, 12, 48), blueGlow);
    ringOuter.position.y = 2.4;
    coreGroup.add(ringOuter);

    const ringInner = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.05, 12, 40), orangeGlow);
    ringInner.position.y = 2.4;
    ringInner.rotation.x = Math.PI / 3;
    coreGroup.add(ringInner);

    // Surrounding tactical pillars
    const pillars: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const r = 6.5;
      const h = 3.2 + (i % 2) * 1.4;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), darkMetal);
      p.position.set(Math.cos(ang) * r, h / 2, Math.sin(ang) * r);
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.14, 0.96),
        i % 2 === 0 ? orangeGlow : blueGlow
      );
      cap.position.y = h / 2 - 0.35;
      p.add(cap);
      coreGroup.add(p);
      pillars.push(p);
    }

    coreGroup.position.set(3.2, 0, -1.5);
    scene.add(coreGroup);

    // Instanced floating energy cubes
    const count = 28;
    const cubeGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00d2ff,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });
    const instanced = new THREE.InstancedMesh(cubeGeo, cubeMat, count);
    const dummy = new THREE.Object3D();
    const seeds = Array.from({ length: count }, (_, idx) => ({
      angle: (idx / count) * Math.PI * 2,
      radius: 4.5 + (idx % 5) * 1.4,
      yBase: 0.8 + (idx % 4) * 1.1,
      speed: 0.25 + (idx % 3) * 0.12,
    }));
    scene.add(instanced);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();

      innerCrystal.rotation.y = elapsed * 0.9;
      innerCrystal.position.y = 2.4 + Math.sin(elapsed * 1.8) * 0.18;
      ringOuter.rotation.y = elapsed * 0.55;
      ringOuter.rotation.x = Math.sin(elapsed * 0.4) * 0.4;
      ringInner.rotation.z = -elapsed * 0.7;

      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        const a = s.angle + elapsed * s.speed;
        dummy.position.set(
          3.2 + Math.cos(a) * s.radius,
          s.yBase + Math.sin(elapsed * 1.5 + i) * 0.35,
          -1.5 + Math.sin(a) * s.radius
        );
        dummy.rotation.set(elapsed + i, elapsed * 0.6, 0);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
      }
      instanced.instanceMatrix.needsUpdate = true;

      camera.position.x = Math.sin(elapsed * 0.2) * 0.8;
      camera.lookAt(1.8, 1.8, -1.0);

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1200;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      floorGeo.dispose();
      floorMat.dispose();
      cubeGeo.dispose();
      cubeMat.dispose();
      darkMetal.dispose();
      orangeGlow.dispose();
      blueGlow.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};
