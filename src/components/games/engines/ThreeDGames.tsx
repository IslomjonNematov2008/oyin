import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GameItem } from '../../../types/hub.ts';
import { soundFx } from '../../../utils/soundFx.ts';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Crosshair, Zap } from 'lucide-react';

interface EngineProps {
  game: GameItem;
  onFinish: (score: number, won: boolean) => void;
}

function detectSoftwareGl(): boolean {
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
}

export const ThreeDGameEngine: React.FC<EngineProps> = ({ game, onFinish }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef({ left: false, right: false, up: false, down: false, action: false });
  const finishedRef = useRef(false);
  const finishCbRef = useRef(onFinish);
  finishCbRef.current = onFinish;

  const [hud, setHud] = useState({
    score: 0,
    secondaryLabel: 'Nishon',
    secondaryValue: `${game.engineConfig.targetScore || 100}`,
    timeLeft: game.engineConfig.timeLimitSec || 60,
    hp: 100,
    hint: '',
  });

  useEffect(() => {
    finishedRef.current = false;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const accentColor = new THREE.Color(game.engineConfig.accentHex || '#FF6B00');
    const secColor = new THREE.Color(game.engineConfig.secondaryHex || '#00D2FF');
    const speedMult = game.engineConfig.speedMultiplier || 1;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090f);
    scene.fog = new THREE.FogExp2(0x07090f, 0.025);

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 140);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0x60a5fa, 0x0b0e16, 0.9);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.0);
    keyLight.position.set(10, 18, 12);
    keyLight.castShadow = !isSoftwareGl;
    scene.add(keyLight);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(d: T): T => {
      disposables.push(d);
      return d;
    };

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const finishOnce = (score: number, won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (won) soundFx.victory();
      finishCbRef.current(score, won);
    };

    // Keyboard listeners
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputRef.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inputRef.current.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') inputRef.current.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') inputRef.current.down = true;
      if (e.code === 'Space') {
        e.preventDefault();
        inputRef.current.action = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') inputRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') inputRef.current.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') inputRef.current.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') inputRef.current.down = false;
      if (e.code === 'Space') inputRef.current.action = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let updateScene: (dt: number, elapsed: number) => void = () => {};

    // ====================================================
    // 1. RACER 3D ENGINE
    // ====================================================
    if (game.engine === 'racer3d') {
      camera.position.set(0, 3.6, 7.2);
      camera.lookAt(0, 0.8, -6);

      const roadMat = track(new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 0.4, metalness: 0.5 }));
      const road = new THREE.Mesh(track(new THREE.PlaneGeometry(12, 160)), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.z = -60;
      road.receiveShadow = true;
      scene.add(road);

      const stripeMat = track(new THREE.MeshStandardMaterial({ color: secColor, emissive: secColor, emissiveIntensity: 1.3 }));
      const stripes: THREE.Mesh[] = [];
      for (let i = 0; i < 16; i++) {
        const s = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.04, 2.5)), stripeMat);
        s.position.set(0, 0.03, -i * 8);
        scene.add(s);
        stripes.push(s);
      }

      // Composite 5-part hover racer
      const car = new THREE.Group();
      const hullMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 }));
      const accentMat = track(new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.4 }));
      const glassMat = track(new THREE.MeshStandardMaterial({ color: secColor, metalness: 0.9, roughness: 0.1 }));

      const body = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.45, 2.6)), hullMat);
      body.position.y = 0.45;
      car.add(body);
      const canopy = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.35, 1.2)), glassMat);
      canopy.position.set(0, 0.78, -0.1);
      car.add(canopy);
      const wing = new THREE.Mesh(track(new THREE.BoxGeometry(1.75, 0.12, 0.45)), accentMat);
      wing.position.set(0, 0.75, 1.15);
      car.add(wing);
      const thrusterL = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.22, 0.4, 12)), accentMat);
      thrusterL.rotation.x = Math.PI / 2;
      thrusterL.position.set(-0.45, 0.42, 1.3);
      car.add(thrusterL);
      const thrusterR = thrusterL.clone();
      thrusterR.position.x = 0.45;
      car.add(thrusterR);
      scene.add(car);

      interface RoadItem {
        mesh: THREE.Mesh;
        isCrystal: boolean;
      }
      const items: RoadItem[] = [];
      const obsMat = track(new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.0 }));
      const crysMat = track(new THREE.MeshStandardMaterial({ color: secColor, emissive: secColor, emissiveIntensity: 1.5 }));
      const obsGeo = track(new THREE.BoxGeometry(1.4, 1.1, 1.4));
      const crysGeo = track(new THREE.OctahedronGeometry(0.55, 0));

      for (let i = 0; i < 12; i++) {
        const isCrystal = i % 3 === 0;
        const m = new THREE.Mesh(isCrystal ? crysGeo : obsGeo, isCrystal ? crysMat : obsMat);
        m.position.set((Math.floor(Math.random() * 3) - 1) * 3.2, isCrystal ? 0.8 : 0.55, -24 - i * 11);
        scene.add(m);
        items.push({ mesh: m, isCrystal });
      }

      let carX = 0;
      let score = 0;
      let hp = 100;
      const targetScore = game.engineConfig.targetScore || 800;

      updateScene = (dt) => {
        if (finishedRef.current) return;
        const steer = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
        const turbo = inputRef.current.up ? 1.45 : 1.0;
        carX = THREE.MathUtils.clamp(carX + steer * dt * 11, -4.2, 4.2);
        car.position.x = THREE.MathUtils.damp(car.position.x, carX, 12, dt);
        car.rotation.z = THREE.MathUtils.damp(car.rotation.z, -steer * 0.18, 10, dt);

        const speed = (20 + score * 0.012) * speedMult * turbo;
        score += dt * 18 * turbo;

        stripes.forEach((s) => {
          s.position.z += speed * dt;
          if (s.position.z > 8) s.position.z -= 128;
        });

        for (const it of items) {
          it.mesh.position.z += speed * dt;
          if (it.isCrystal) it.mesh.rotation.y += dt * 2.5;
          if (Math.abs(it.mesh.position.z - car.position.z) < 1.3 && Math.abs(it.mesh.position.x - car.position.x) < 1.25) {
            if (it.isCrystal) {
              score += 75;
              soundFx.collect();
            } else {
              hp = Math.max(0, hp - 34);
              soundFx.hit();
            }
            it.mesh.position.z = -110 - Math.random() * 25;
            it.mesh.position.x = (Math.floor(Math.random() * 3) - 1) * 3.2;
          }
          if (it.mesh.position.z > 10) {
            it.mesh.position.z = -110 - Math.random() * 25;
            it.mesh.position.x = (Math.floor(Math.random() * 3) - 1) * 3.2;
          }
        }

        const rounded = Math.floor(score);
        setHud({
          score: rounded,
          secondaryLabel: 'Maqsad',
          secondaryValue: `${targetScore}`,
          timeLeft: Math.max(0, hp),
          hp,
          hint: 'A/D bilan boshqaring · W — Turbo',
        });

        if (hp <= 0) {
          finishOnce(rounded, false);
        } else if (rounded >= targetScore) {
          finishOnce(rounded, true);
        }
      };
    }

    // ====================================================
    // 2. MAZE 3D ENGINE
    // ====================================================
    else if (game.engine === 'maze3d') {
      const size = game.engineConfig.gridSize || 7;
      const cellSize = 3.0;
      const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(1));
      const carve = (r: number, c: number) => {
        grid[r][c] = 0;
        const dirs = [
          [0, 2],
          [0, -2],
          [2, 0],
          [-2, 0],
        ].sort(() => Math.random() - 0.5);
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr > 0 && nr < size - 1 && nc > 0 && nc < size - 1 && grid[nr][nc] === 1) {
            grid[r + dr / 2][c + dc / 2] = 0;
            carve(nr, nc);
          }
        }
      };
      carve(1, 1);
      grid[size - 2][size - 2] = 0;

      const offset = ((size - 1) * cellSize) / 2;
      const wallBoxes: THREE.Box3[] = [];
      const wallGeo = track(new THREE.BoxGeometry(cellSize, 2.4, cellSize));
      const wallMat = track(new THREE.MeshStandardMaterial({ color: 0x151c2c, roughness: 0.4, metalness: 0.6 }));
      const floor = new THREE.Mesh(
        track(new THREE.PlaneGeometry(size * cellSize + 8, size * cellSize + 8)),
        track(new THREE.MeshStandardMaterial({ color: 0x090c14, roughness: 0.7 }))
      );
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);

      const openCells: Array<[number, number]> = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const wx = c * cellSize - offset;
          const wz = r * cellSize - offset;
          if (grid[r][c] === 1) {
            const w = new THREE.Mesh(wallGeo, wallMat);
            w.position.set(wx, 1.2, wz);
            scene.add(w);
            wallBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(wx, 1.2, wz), new THREE.Vector3(cellSize - 0.1, 2.4, cellSize - 0.1)));
          } else if (!(r === 1 && c === 1) && !(r === size - 2 && c === size - 2)) {
            openCells.push([wx, wz]);
          }
        }
      }

      // Collectible crystals
      const crystals: THREE.Mesh[] = [];
      const crysGeo = track(new THREE.OctahedronGeometry(0.45, 0));
      const crysMat = track(new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.5 }));
      openCells.sort(() => Math.random() - 0.5).slice(0, 5).forEach(([wx, wz]) => {
        const m = new THREE.Mesh(crysGeo, crysMat);
        m.position.set(wx, 0.9, wz);
        scene.add(m);
        crystals.push(m);
      });

      // Exit portal
      const exitX = (size - 2) * cellSize - offset;
      const exitZ = (size - 2) * cellSize - offset;
      const portal = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.85, 0.12, 12, 32)),
        track(new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.8 }))
      );
      portal.position.set(exitX, 1.1, exitZ);
      scene.add(portal);

      // Composite player rover
      const player = new THREE.Group();
      const roverBase = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.45, 0.55, 0.6, 12)),
        track(new THREE.MeshStandardMaterial({ color: secColor, emissive: secColor, emissiveIntensity: 0.7 }))
      );
      roverBase.position.y = 0.3;
      const roverHead = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.32, 12, 12)),
        track(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.2 }))
      );
      roverHead.position.y = 0.8;
      player.add(roverBase, roverHead);
      player.position.set(1 * cellSize - offset, 0, 1 * cellSize - offset);
      scene.add(player);

      let collected = 0;
      const totalCrystals = crystals.length;
      let timeLeft = game.engineConfig.timeLimitSec || 90;

      updateScene = (dt, elapsed) => {
        if (finishedRef.current) return;
        timeLeft -= dt;
        const mx = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
        const mz = (inputRef.current.down ? 1 : 0) - (inputRef.current.up ? 1 : 0);

        const speed = 6.2;
        const nextX = player.position.x + mx * speed * dt;
        const nextZ = player.position.z + mz * speed * dt;
        const testBoxX = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(nextX, 0.6, player.position.z), new THREE.Vector3(0.85, 1.0, 0.85));
        if (!wallBoxes.some((b) => b.intersectsBox(testBoxX))) {
          player.position.x = nextX;
        }
        const testBoxZ = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(player.position.x, 0.6, nextZ), new THREE.Vector3(0.85, 1.0, 0.85));
        if (!wallBoxes.some((b) => b.intersectsBox(testBoxZ))) {
          player.position.z = nextZ;
        }

        camera.position.x = THREE.MathUtils.damp(camera.position.x, player.position.x, 8, dt);
        camera.position.y = 11.5;
        camera.position.z = THREE.MathUtils.damp(camera.position.z, player.position.z + 8.5, 8, dt);
        camera.lookAt(player.position.x, 0.5, player.position.z);

        portal.rotation.y = elapsed * 2;
        crystals.forEach((c) => {
          if (!c.visible) return;
          c.rotation.y = elapsed * 2.4;
          if (c.position.distanceTo(player.position) < 1.2) {
            c.visible = false;
            collected += 1;
            soundFx.collect();
          }
        });

        setHud({
          score: collected * 100,
          secondaryLabel: 'Kristallar',
          secondaryValue: `${collected}/${totalCrystals}`,
          timeLeft: Math.max(0, Math.ceil(timeLeft)),
          hp: 100,
          hint: 'Kristallarni yig‘ing va yashil portalga kiring!',
        });

        if (collected >= totalCrystals && Math.hypot(player.position.x - exitX, player.position.z - exitZ) < 1.35) {
          finishOnce(collected * 100 + Math.ceil(timeLeft) * 5, true);
        } else if (timeLeft <= 0) {
          finishOnce(collected * 100, false);
        }
      };
    }

    // ====================================================
    // 3. ORB 3D ARENA ENGINE
    // ====================================================
    else if (game.engine === 'orb3d') {
      camera.position.set(0, 14, 13);
      camera.lookAt(0, 0, 0);

      const arenaFloor = new THREE.Mesh(
        track(new THREE.BoxGeometry(22, 0.5, 22)),
        track(new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.4, metalness: 0.5 }))
      );
      arenaFloor.position.y = -0.25;
      scene.add(arenaFloor);
      scene.add(new THREE.GridHelper(22, 11, secColor, 0x1c2538));

      const player = new THREE.Group();
      const core = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.55, 16, 16)),
        track(new THREE.MeshStandardMaterial({ color: secColor, emissive: secColor, emissiveIntensity: 1.1 }))
      );
      core.position.y = 0.6;
      const ring = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.75, 0.08, 8, 24)),
        track(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 }))
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.6;
      player.add(core, ring);
      scene.add(player);

      const targetOrb = new THREE.Mesh(
        track(new THREE.OctahedronGeometry(0.55, 0)),
        track(new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.6 }))
      );
      targetOrb.position.set(5, 0.7, -5);
      scene.add(targetOrb);

      const drones = Array.from({ length: 4 }, (_, i) => {
        const d = new THREE.Mesh(
          track(new THREE.ConeGeometry(0.55, 1.2, 6)),
          track(new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.2 }))
        );
        d.position.set((i % 2 === 0 ? -7 : 7), 0.7, (i < 2 ? -7 : 7));
        d.userData = { vx: (i % 2 === 0 ? 1 : -1) * 3.5 * speedMult, vz: (i < 2 ? 1 : -1) * 2.8 * speedMult };
        scene.add(d);
        return d;
      });

      let score = 0;
      let hp = 100;
      const targetScore = game.engineConfig.targetScore || 15;
      let invuln = 0;

      updateScene = (dt, elapsed) => {
        if (finishedRef.current) return;
        invuln = Math.max(0, invuln - dt);
        const mx = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
        const mz = (inputRef.current.down ? 1 : 0) - (inputRef.current.up ? 1 : 0);
        player.position.x = THREE.MathUtils.clamp(player.position.x + mx * dt * 8.5, -9.8, 9.8);
        player.position.z = THREE.MathUtils.clamp(player.position.z + mz * dt * 8.5, -9.8, 9.8);
        ring.rotation.z = elapsed * 2;
        targetOrb.rotation.y = elapsed * 3;

        if (player.position.distanceTo(targetOrb.position) < 1.3) {
          score += 1;
          soundFx.collect();
          targetOrb.position.set((Math.random() - 0.5) * 16, 0.7, (Math.random() - 0.5) * 16);
        }

        for (const d of drones) {
          d.rotation.y += dt * 4;
          d.position.x += d.userData.vx * dt;
          d.position.z += d.userData.vz * dt;
          if (Math.abs(d.position.x) > 9.5) d.userData.vx *= -1;
          if (Math.abs(d.position.z) > 9.5) d.userData.vz *= -1;

          if (invuln <= 0 && d.position.distanceTo(player.position) < 1.2) {
            hp = Math.max(0, hp - 34);
            invuln = 1.0;
            soundFx.hit();
          }
        }

        setHud({
          score,
          secondaryLabel: 'Maqsad',
          secondaryValue: `${score}/${targetScore}`,
          timeLeft: hp,
          hp,
          hint: 'Yashil sferalarni yig‘ing, dronlardan saqlaning!',
        });

        if (hp <= 0) finishOnce(score * 30, false);
        else if (score >= targetScore) finishOnce(score * 50, true);
      };
    }

    // ====================================================
    // 4. STACKER 3D ENGINE
    // ====================================================
    else if (game.engine === 'stacker3d') {
      camera.position.set(6.5, 6.5, 8.5);
      camera.lookAt(0, 1.5, 0);

      const blocks: THREE.Mesh[] = [];
      const base = new THREE.Mesh(
        track(new THREE.BoxGeometry(3.6, 0.6, 3.6)),
        track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 }))
      );
      base.position.y = 0.3;
      scene.add(base);
      blocks.push(base);

      let currW = 3.6;
      let currD = 3.6;
      let level = 1;
      let dir = 1;
      let axis: 'x' | 'z' = 'x';
      let activeMesh = new THREE.Mesh(
        track(new THREE.BoxGeometry(currW, 0.6, currD)),
        track(new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.35 }))
      );
      activeMesh.position.set(-4, 0.9, 0);
      scene.add(activeMesh);

      let wasAction = false;
      const targetScore = game.engineConfig.targetScore || 18;

      const dropBlock = () => {
        if (finishedRef.current) return;
        const prev = blocks[blocks.length - 1];
        const delta = axis === 'x' ? activeMesh.position.x - prev.position.x : activeMesh.position.z - prev.position.z;
        const size = axis === 'x' ? currW : currD;
        const overlap = size - Math.abs(delta);
        if (overlap <= 0.12) {
          soundFx.hit();
          finishOnce(level - 1, level - 1 >= Math.floor(targetScore * 0.6));
          return;
        }
        soundFx.collect();
        if (axis === 'x') {
          currW = overlap;
          activeMesh.scale.x = currW / 3.6;
          activeMesh.position.x = prev.position.x + delta / 2;
        } else {
          currD = overlap;
          activeMesh.scale.z = currD / 3.6;
          activeMesh.position.z = prev.position.z + delta / 2;
        }
        blocks.push(activeMesh);

        if (level >= targetScore) {
          finishOnce(level * 40, true);
          return;
        }

        level += 1;
        axis = level % 2 === 0 ? 'z' : 'x';
        const nextColor = level % 2 === 0 ? secColor : accentColor;
        activeMesh = new THREE.Mesh(
          track(new THREE.BoxGeometry(currW, 0.6, currD)),
          track(new THREE.MeshStandardMaterial({ color: nextColor, emissive: nextColor, emissiveIntensity: 0.35 }))
        );
        activeMesh.position.set(
          axis === 'x' ? -4.5 : prev.position.x,
          0.3 + level * 0.6,
          axis === 'z' ? -4.5 : prev.position.z
        );
        scene.add(activeMesh);
      };

      const onPointerDown = () => {
        inputRef.current.action = true;
      };
      renderer.domElement.addEventListener('pointerdown', onPointerDown);

      updateScene = (dt) => {
        if (finishedRef.current) return;
        const spd = (4.2 + level * 0.22) * speedMult;
        if (axis === 'x') {
          activeMesh.position.x += dir * spd * dt;
          if (Math.abs(activeMesh.position.x) > 4.6) dir *= -1;
        } else {
          activeMesh.position.z += dir * spd * dt;
          if (Math.abs(activeMesh.position.z) > 4.6) dir *= -1;
        }

        if (inputRef.current.action && !wasAction) {
          dropBlock();
        }
        wasAction = inputRef.current.action;
        inputRef.current.action = false;

        const targetCamY = 5.5 + level * 0.58;
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 6, dt);
        camera.lookAt(0, level * 0.55, 0);

        setHud({
          score: level - 1,
          secondaryLabel: 'Maqsad qavat',
          secondaryValue: `${level - 1}/${targetScore}`,
          timeLeft: 100,
          hp: 100,
          hint: 'Space yoki sichqoncha bilan blokni tushiring!',
        });
      };
    }

    // ====================================================
    // 5. DEFENSE 3D ENGINE
    // ====================================================
    else if (game.engine === 'defense3d') {
      camera.position.set(0, 10, 14);
      camera.lookAt(0, 0, -4);

      const ground = new THREE.Mesh(
        track(new THREE.PlaneGeometry(34, 40)),
        track(new THREE.MeshStandardMaterial({ color: 0x0b101b, roughness: 0.7 }))
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      scene.add(new THREE.GridHelper(32, 16, secColor, 0x182133));

      // Composite 3-part turret
      const turret = new THREE.Group();
      const tBase = new THREE.Mesh(
        track(new THREE.CylinderGeometry(1.1, 1.4, 0.8, 8)),
        track(new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 }))
      );
      tBase.position.y = 0.4;
      const tBarrel = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.18, 0.24, 2.2, 8)),
        track(new THREE.MeshStandardMaterial({ color: secColor, emissive: secColor, emissiveIntensity: 1.0 }))
      );
      tBarrel.rotation.x = Math.PI / 2;
      tBarrel.position.set(0, 1.0, -1.0);
      turret.add(tBase, tBarrel);
      turret.position.set(0, 0, 8);
      scene.add(turret);

      const enemies: THREE.Mesh[] = [];
      const enemyGeo = track(new THREE.OctahedronGeometry(0.75, 0));
      const enemyMat = track(new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.2 }));

      const spawnEnemy = () => {
        const e = new THREE.Mesh(enemyGeo, enemyMat);
        e.position.set((Math.random() - 0.5) * 18, 0.9, -18 - Math.random() * 8);
        scene.add(e);
        enemies.push(e);
      };
      for (let i = 0; i < 4; i++) spawnEnemy();

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let kills = 0;
      let hp = 100;
      const targetScore = game.engineConfig.targetScore || 20;

      const onShot = (ev: PointerEvent) => {
        if (finishedRef.current) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        soundFx.laser(720);

        const hits = raycaster.intersectObjects(enemies);
        if (hits.length > 0) {
          const hitObj = hits[0].object as THREE.Mesh;
          turret.lookAt(hitObj.position.x, 0, hitObj.position.z);
          hitObj.position.set((Math.random() - 0.5) * 18, 0.9, -20 - Math.random() * 8);
          kills += 1;
          soundFx.hit();
        }
      };
      renderer.domElement.addEventListener('pointerdown', onShot);

      updateScene = (dt) => {
        if (finishedRef.current) return;
        for (const e of enemies) {
          e.rotation.y += dt * 3;
          e.position.z += (4.0 + kills * 0.14) * speedMult * dt;
          if (e.position.z >= 7.5) {
            hp = Math.max(0, hp - 25);
            e.position.set((Math.random() - 0.5) * 18, 0.9, -20);
            soundFx.hit();
          }
        }

        setHud({
          score: kills * 25,
          secondaryLabel: 'Yo‘q qilindi',
          secondaryValue: `${kills}/${targetScore}`,
          timeLeft: hp,
          hp,
          hint: 'Kelayotgan dronlarga bosing va bazani himoya qiling!',
        });

        if (hp <= 0) finishOnce(kills * 25, false);
        else if (kills >= targetScore) finishOnce(kills * 40, true);
      };
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

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
      const dt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      updateScene(dt, elapsed);
      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }
    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 460;
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [game]);

  const holdKey = (key: 'left' | 'right' | 'up' | 'down' | 'action', active: boolean) => {
    inputRef.current[key] = active;
  };

  return (
    <div className="space-y-3">
      {/* Compact HUD strip */}
      <div className="grid grid-cols-3 gap-3 bg-[#090C12] border border-white/10 rounded-xl px-4 py-2.5 text-xs">
        <div>
          <span className="text-slate-400 block">Ball</span>
          <span className="font-mono text-base font-bold text-[#FF6B00] tabular-nums">{hud.score}</span>
        </div>
        <div>
          <span className="text-slate-400 block">{hud.secondaryLabel}</span>
          <span className="font-mono text-base font-bold text-[#00D2FF] tabular-nums">{hud.secondaryValue}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 block">{game.engine === 'maze3d' ? 'Vaqt (s)' : 'Himoya %'}</span>
          <span className="font-mono text-base font-bold text-white tabular-nums">{hud.timeLeft}</span>
        </div>
      </div>

      {/* 3D WebGL Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#06070A] h-[340px] sm:h-[420px]">
        <div ref={mountRef} className="w-full h-full cursor-crosshair" />
        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/75 border border-white/10 text-[11px] text-slate-300 pointer-events-none">
          {hud.hint}
        </div>
      </div>

      {/* Touch / Mobile Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={() => holdKey('left', true)}
            onPointerUp={() => holdKey('left', false)}
            onPointerLeave={() => holdKey('left', false)}
            className="w-11 h-11 rounded-xl bg-[#121722] border border-white/10 flex items-center justify-center text-white active:bg-[#FF6B00]"
            aria-label="Chapga"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onPointerDown={() => holdKey('up', true)}
            onPointerUp={() => holdKey('up', false)}
            onPointerLeave={() => holdKey('up', false)}
            className="w-11 h-11 rounded-xl bg-[#121722] border border-white/10 flex items-center justify-center text-white active:bg-[#FF6B00]"
            aria-label="Oldinga"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            onPointerDown={() => holdKey('down', true)}
            onPointerUp={() => holdKey('down', false)}
            onPointerLeave={() => holdKey('down', false)}
            className="w-11 h-11 rounded-xl bg-[#121722] border border-white/10 flex items-center justify-center text-white active:bg-[#FF6B00]"
            aria-label="Orqaga"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            type="button"
            onPointerDown={() => holdKey('right', true)}
            onPointerUp={() => holdKey('right', false)}
            onPointerLeave={() => holdKey('right', false)}
            className="w-11 h-11 rounded-xl bg-[#121722] border border-white/10 flex items-center justify-center text-white active:bg-[#FF6B00]"
            aria-label="O‘ngga"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onPointerDown={() => holdKey('action', true)}
          onPointerUp={() => holdKey('action', false)}
          className="px-4 h-11 rounded-xl bg-[#FF6B00] hover:bg-[#FF7D1F] text-white text-xs font-semibold flex items-center gap-2"
        >
          {game.engine === 'defense3d' ? <Crosshair className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          <span>{game.engine === 'stacker3d' ? 'Blokni tushirish' : 'Tezlanish / Harakat'}</span>
        </button>
      </div>
    </div>
  );
};
