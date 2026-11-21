import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useHub } from '../../context/HubContext.tsx';
import { ArenaMapId } from '../../types/hub.ts';
import { soundFx } from '../../utils/soundFx.ts';
import {
  Crosshair,
  Users,
  Bot,
  Copy,
  Shield,
  Heart,
  Clock,
  Trophy,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface ArenaMapMeta {
  id: ArenaMapId;
  name: string;
  desc: string;
  image: string;
  bgHex: number;
  floorHex: number;
  wallHex: number;
  accentHex: number;
  secHex: number;
}

export const ARENA_MAPS: ArenaMapMeta[] = [
  {
    id: 'cyber_city',
    name: 'Cyber City',
    desc: 'Tungi kiber shahar maydoni, energiya to‘siqlari va yorqin aks ettiruvchi asfalt.',
    image: '/src/assets/images/arena_cyber_city_1795273637435.jpg',
    bgHex: 0x070a14,
    floorHex: 0x0d1322,
    wallHex: 0x162033,
    accentHex: 0x00d2ff,
    secHex: 0xff6b00,
  },
  {
    id: 'desert_arena',
    name: 'Desert Arena',
    desc: 'Qizilqum kanyoni va quyosh energiya minoralari orasidagi ochiq taktik poligon.',
    image: '/src/assets/images/arena_desert_nexus_1795273636927.jpg',
    bgHex: 0x1a120b,
    floorHex: 0x3b2a1c,
    wallHex: 0x5c3d28,
    accentHex: 0xf59e0b,
    secHex: 0x38bdf8,
  },
  {
    id: 'industrial_zone',
    name: 'Industrial Zone',
    desc: 'Po‘lat yo‘laklar, plazma reaktorlar va og‘ir sanoat konteynerlari.',
    image: '/src/assets/images/arena_industrial_base_1795273637819.jpg',
    bgHex: 0x0b0e12,
    floorHex: 0x181d26,
    wallHex: 0x262f3d,
    accentHex: 0xff6b00,
    secHex: 0x22d3ee,
  },
  {
    id: 'night_city',
    name: 'Night City',
    desc: 'Osmono‘par binolar tomidagi tungi duel maydoni.',
    image: '/src/assets/images/hero_gaming_arena_1795273637113.jpg',
    bgHex: 0x05060c,
    floorHex: 0x0b0f1a,
    wallHex: 0x171d2e,
    accentHex: 0x38bdf8,
    secHex: 0xff6b00,
  },
  {
    id: 'futuristic_base',
    name: 'Futuristic Base',
    desc: 'Titan angari, krio-qalqon ustunlari va markaziy energiya yadrosi.',
    image: '/src/assets/images/arena_industrial_base_1795273637819.jpg',
    bgHex: 0x060b12,
    floorHex: 0x101826,
    wallHex: 0x1b283c,
    accentHex: 0x00d2ff,
    secHex: 0xf97316,
  },
];

type WeaponType = 'karabin' | 'snayper' | 'pulemyot';
const WEAPONS: Record<WeaponType, { name: string; cooldown: number; damage: number; color: number }> = {
  karabin: { name: 'Plazma Karabin', cooldown: 150, damage: 22, color: 0x00d2ff },
  snayper: { name: 'Impuls Snayper', cooldown: 720, damage: 65, color: 0xff6b00 },
  pulemyot: { name: 'Foton Pulemyot', cooldown: 95, damage: 14, color: 0x22d3ee },
};

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

function buildOperativeMesh(primaryHex: number, accentHex: number): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: primaryHex, metalness: 0.72, roughness: 0.35 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.25 });
  const glowMat = new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 1.6 });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.3), armorMat);
  legL.position.set(-0.2, 0.425, 0);
  const legR = legL.clone();
  legR.position.x = 0.2;

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.44), bodyMat);
  torso.position.y = 1.3;
  const chestCore = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.47), glowMat);
  chestCore.position.y = 1.38;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), armorMat);
  head.position.y = 2.02;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.46), glowMat);
  visor.position.set(0, 2.04, 0.01);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.24), armorMat);
  armL.position.set(-0.5, 1.32, 0.1);
  const armR = armL.clone();
  armR.position.set(0.5, 1.32, 0.22);
  armR.rotation.x = -Math.PI / 3;

  const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.95), glowMat);
  rifle.position.set(0.5, 1.32, 0.65);

  group.add(legL, legR, torso, chestCore, head, visor, armL, armR, rifle);
  return group;
}

export const Arena1v1: React.FC = () => {
  const { user, socket, notify, completePracticeMatch, refreshHub } = useHub();

  const [selectedMap, setSelectedMap] = useState<ArenaMapId>('cyber_city');
  const [phase, setPhase] = useState<'lobby' | 'searching' | 'private_wait' | 'playing' | 'summary'>('lobby');
  const [mode, setMode] = useState<'online' | 'demo_bot'>('online');
  const [roomCode, setRoomCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [opponentName, setOpponentName] = useState('Raqib');

  const [weapon, setWeapon] = useState<WeaponType>('karabin');
  const weaponRef = useRef<WeaponType>('karabin');
  weaponRef.current = weapon;

  const [hud, setHud] = useState({
    myHp: 100,
    myShield: 50,
    oppHp: 100,
    myRounds: 0,
    oppRounds: 0,
    round: 1,
    timer: 90,
    banner: '',
  });
  const [summary, setSummary] = useState<{ won: boolean; myRounds: number; oppRounds: number; reason: string; xp: number } | null>(null);

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef({ fwd: false, back: false, left: false, right: false, jump: false, fire: false });
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const myPosRef = useRef({ x: -14, y: 0, z: -10 });
  const oppTargetRef = useRef({ x: 14, y: 0, z: 10, yaw: 0 });
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Bind Socket.IO events for real 1v1 multiplayer
  useEffect(() => {
    if (!socket) return;

    const onWaiting = () => {
      setPhase('searching');
    };
    const onCreated = ({ code }: { code: string }) => {
      setRoomCode(code);
      setPhase('private_wait');
    };
    const onRoomError = ({ message }: { message: string }) => {
      notify(message, 'error');
    };
    const onMatchStarted = (payload: {
      arenaMap: ArenaMapId;
      round: number;
      roundSecondsLeft: number;
      players: Array<{ userId: string; username: string; x: number; y: number; z: number; yaw: number; hp: number; shield: number; roundWins: number }>;
    }) => {
      const me = payload.players.find((p) => p.userId === user?.id) || payload.players[0];
      const opp = payload.players.find((p) => p.userId !== user?.id) || payload.players[1];
      setSelectedMap(payload.arenaMap);
      setMode('online');
      setOpponentName(opp?.username || 'Raqib');
      myPosRef.current = { x: me.x, y: me.y, z: me.z };
      yawRef.current = me.yaw;
      if (opp) oppTargetRef.current = { x: opp.x, y: opp.y, z: opp.z, yaw: opp.yaw };
      setHud({
        myHp: me.hp,
        myShield: me.shield,
        oppHp: opp?.hp ?? 100,
        myRounds: me.roundWins,
        oppRounds: opp?.roundWins ?? 0,
        round: payload.round,
        timer: payload.roundSecondsLeft,
        banner: '1-Raund boshlandi!',
      });
      setSummary(null);
      setPhase('playing');
      soundFx.collect();
    };

    const onOppState = (data: { x: number; y: number; z: number; yaw: number }) => {
      oppTargetRef.current = { x: data.x, y: data.y, z: data.z, yaw: data.yaw };
    };

    const onTimer = ({ roundSecondsLeft }: { roundSecondsLeft: number }) => {
      setHud((h) => ({ ...h, timer: roundSecondsLeft }));
    };

    const onDamage = (data: { targetUserId: string; hp: number; shield: number }) => {
      soundFx.hit();
      if (data.targetUserId === user?.id) {
        setHud((h) => ({ ...h, myHp: data.hp, myShield: data.shield }));
      } else {
        setHud((h) => ({ ...h, oppHp: data.hp }));
      }
    };

    const onRoundEnd = (data: {
      reason: string;
      nextRound: number;
      roundSecondsLeft: number;
      players: Array<{ userId: string; x: number; y: number; z: number; yaw: number; hp: number; shield: number; roundWins: number }>;
    }) => {
      const me = data.players.find((p) => p.userId === user?.id) || data.players[0];
      const opp = data.players.find((p) => p.userId !== user?.id) || data.players[1];
      myPosRef.current = { x: me.x, y: me.y, z: me.z };
      yawRef.current = me.yaw;
      if (opp) oppTargetRef.current = { x: opp.x, y: opp.y, z: opp.z, yaw: opp.yaw };
      setHud({
        myHp: me.hp,
        myShield: me.shield,
        oppHp: opp?.hp ?? 100,
        myRounds: me.roundWins,
        oppRounds: opp?.roundWins ?? 0,
        round: data.nextRound,
        timer: data.roundSecondsLeft,
        banner: `${data.nextRound}-Raund: ${data.reason}`,
      });
    };

    const onMatchEnded = (data: {
      winnerUserId: string;
      reason: string;
      players: Array<{ userId: string; roundWins: number; xpEarned: number }>;
    }) => {
      const won = data.winnerUserId === user?.id;
      const me = data.players.find((p) => p.userId === user?.id);
      const opp = data.players.find((p) => p.userId !== user?.id);
      if (won) soundFx.victory();
      setSummary({
        won,
        myRounds: me?.roundWins ?? 0,
        oppRounds: opp?.roundWins ?? 0,
        reason: data.reason,
        xp: me?.xpEarned ?? (won ? 160 : 55),
      });
      setPhase('summary');
      refreshHub();
    };

    socket.on('queue:waiting', onWaiting);
    socket.on('room:created', onCreated);
    socket.on('room:error', onRoomError);
    socket.on('match:started', onMatchStarted);
    socket.on('opponent:state', onOppState);
    socket.on('match:timer', onTimer);
    socket.on('match:damage', onDamage);
    socket.on('match:round_end', onRoundEnd);
    socket.on('match:ended', onMatchEnded);

    return () => {
      socket.off('queue:waiting', onWaiting);
      socket.off('room:created', onCreated);
      socket.off('room:error', onRoomError);
      socket.off('match:started', onMatchStarted);
      socket.off('opponent:state', onOppState);
      socket.off('match:timer', onTimer);
      socket.off('match:damage', onDamage);
      socket.off('match:round_end', onRoundEnd);
      socket.off('match:ended', onMatchEnded);
    };
  }, [socket, user?.id, notify, refreshHub]);

  // 3D Three.js Arena Engine
  useEffect(() => {
    if (phase !== 'playing') return;
    const container = canvasMountRef.current;
    if (!container) return;

    const mapMeta = ARENA_MAPS.find((m) => m.id === selectedMap) || ARENA_MAPS[0];
    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(mapMeta.bgHex);
    scene.fog = new THREE.FogExp2(mapMeta.bgHex, 0.018);

    const camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 160);
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

    const hemi = new THREE.HemisphereLight(mapMeta.accentHex, mapMeta.bgHex, 0.85);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.1);
    keyLight.position.set(16, 28, 14);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.camera.left = -30;
    keyLight.shadow.camera.right = 30;
    keyLight.shadow.camera.top = 30;
    keyLight.shadow.camera.bottom = -30;
    scene.add(keyLight);

    // Arena Floor & Grid
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: mapMeta.floorHex, roughness: 0.45, metalness: 0.45 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(54, 27, mapMeta.accentHex, 0x1a2234);
    grid.position.y = 0.02;
    scene.add(grid);

    // Tactical cover obstacles + collision boxes
    const coverBoxes: THREE.Box3[] = [];
    const wallMat = new THREE.MeshStandardMaterial({ color: mapMeta.wallHex, roughness: 0.4, metalness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({
      color: mapMeta.accentHex,
      emissive: mapMeta.accentHex,
      emissiveIntensity: 1.2,
    });
    const secTrimMat = new THREE.MeshStandardMaterial({
      color: mapMeta.secHex,
      emissive: mapMeta.secHex,
      emissiveIntensity: 1.1,
    });

    const coverLayouts: Array<[number, number, number, number, number]> = [
      [0, 0, 3.2, 2.8, 3.2], // Center reactor pillar
      [-8, -6, 3.5, 2.2, 1.4],
      [8, 6, 3.5, 2.2, 1.4],
      [-8, 7, 1.6, 2.0, 4.0],
      [8, -7, 1.6, 2.0, 4.0],
      [0, -14, 5.0, 2.4, 1.4],
      [0, 14, 5.0, 2.4, 1.4],
      [-16, 0, 1.8, 2.6, 5.0],
      [16, 0, 1.8, 2.6, 5.0],
    ];

    coverLayouts.forEach(([x, z, w, h, d], idx) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      box.position.set(x, h / 2, z);
      box.castShadow = !isSoftwareGl;
      box.receiveShadow = true;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.14, d + 0.08), idx % 2 === 0 ? trimMat : secTrimMat);
      trim.position.y = h / 2 - 0.18;
      box.add(trim);
      scene.add(box);
      coverBoxes.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(w, h, d)));
    });

    // Outer boundary beacons
    for (let i = 0; i < 4; i++) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(i < 2 ? 54 : 0.8, 3.2, i < 2 ? 0.8 : 54),
        wallMat
      );
      if (i === 0) wall.position.set(0, 1.6, -27);
      if (i === 1) wall.position.set(0, 1.6, 27);
      if (i === 2) wall.position.set(-27, 1.6, 0);
      if (i === 3) wall.position.set(27, 1.6, 0);
      scene.add(wall);
    }

    // Opponent 3D Operative
    const opponentMesh = buildOperativeMesh(mapMeta.secHex, mapMeta.accentHex);
    opponentMesh.position.set(oppTargetRef.current.x, 0, oppTargetRef.current.z);
    scene.add(opponentMesh);

    // First-person energy weapon viewmodel attached to camera
    const fpWeapon = new THREE.Group();
    const gunBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.14, 0.68),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 })
    );
    const gunBarrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.72),
      new THREE.MeshStandardMaterial({ color: mapMeta.accentHex, emissive: mapMeta.accentHex, emissiveIntensity: 1.5 })
    );
    gunBarrel.position.set(0, 0.04, -0.05);
    fpWeapon.add(gunBody, gunBarrel);
    fpWeapon.position.set(0.28, -0.24, -0.52);
    camera.add(fpWeapon);
    scene.add(camera);

    // Laser tracers pool
    const tracers: Array<{ mesh: THREE.Mesh; ttl: number }> = [];
    const spawnTracer = (from: THREE.Vector3, to: THREE.Vector3, colorHex: number) => {
      const dist = from.distanceTo(to);
      const geo = new THREE.CylinderGeometry(0.035, 0.035, dist, 6);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 });
      const beam = new THREE.Mesh(geo, mat);
      beam.position.copy(from).lerp(to, 0.5);
      beam.lookAt(to);
      scene.add(beam);
      tracers.push({ mesh: beam, ttl: 0.14 });
    };

    // Controls: Pointer drag / lock + Keyboard
    let dragging = false;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        dragging = true;
        inputRef.current.fire = true;
      }
    };
    const onPointerUp = () => {
      dragging = false;
      inputRef.current.fire = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (document.pointerLockElement === renderer.domElement || dragging) {
        yawRef.current -= e.movementX * 0.0032;
        pitchRef.current = THREE.MathUtils.clamp(pitchRef.current - e.movementY * 0.0026, -0.65, 0.65);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputRef.current.fwd = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.back = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.right = true;
      if (e.code === 'Space') inputRef.current.jump = true;
      if (e.code === 'Digit1') setWeapon('karabin');
      if (e.code === 'Digit2') setWeapon('snayper');
      if (e.code === 'Digit3') setWeapon('pulemyot');
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputRef.current.fwd = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.back = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.right = false;
      if (e.code === 'Space') inputRef.current.jump = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Demo Bot state (ONLY active when mode === 'demo_bot')
    let botHp = 100;
    let myHpLocal = 100;
    let myShieldLocal = 50;
    let myRoundsLocal = 0;
    let botRoundsLocal = 0;
    let roundLocal = 1;
    let roundTimerLocal = 90;
    let botFireCd = 0;
    let botPhaseAngle = 0;
    let lastFireMs = 0;
    let lastSyncMs = 0;
    let velY = 0;
    let botFinished = false;

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    if (!isSoftwareGl) renderer.compile(scene, camera);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
        else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const rayDir = new THREE.Vector3();

    function tick() {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      const nowMs = performance.now();

      // Player movement & collision
      const spd = 9.2;
      forwardVec.set(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
      rightVec.set(Math.cos(yawRef.current), 0, -Math.sin(yawRef.current));

      let moveX = 0;
      let moveZ = 0;
      if (inputRef.current.fwd) { moveX += forwardVec.x; moveZ += forwardVec.z; }
      if (inputRef.current.back) { moveX -= forwardVec.x; moveZ -= forwardVec.z; }
      if (inputRef.current.right) { moveX += rightVec.x; moveZ += rightVec.z; }
      if (inputRef.current.left) { moveX -= rightVec.x; moveZ -= rightVec.z; }
      const mLen = Math.hypot(moveX, moveZ);
      if (mLen > 0) {
        moveX = (moveX / mLen) * spd * dt;
        moveZ = (moveZ / mLen) * spd * dt;
      }

      const pos = myPosRef.current;
      const tryX = THREE.MathUtils.clamp(pos.x + moveX, -25, 25);
      const boxX = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(tryX, 1, pos.z), new THREE.Vector3(0.9, 1.8, 0.9));
      if (!coverBoxes.some((b) => b.intersectsBox(boxX))) pos.x = tryX;

      const tryZ = THREE.MathUtils.clamp(pos.z + moveZ, -25, 25);
      const boxZ = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(pos.x, 1, tryZ), new THREE.Vector3(0.9, 1.8, 0.9));
      if (!coverBoxes.some((b) => b.intersectsBox(boxZ))) pos.z = tryZ;

      if (inputRef.current.jump && pos.y <= 0.01) velY = 7.4;
      velY -= 20 * dt;
      pos.y = Math.max(0, pos.y + velY * dt);
      if (pos.y === 0) velY = 0;

      camera.position.set(pos.x, pos.y + 1.62, pos.z);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yawRef.current;
      camera.rotation.x = pitchRef.current;

      // Weapon recoil decay
      fpWeapon.position.z = THREE.MathUtils.damp(fpWeapon.position.z, -0.52, 14, dt);

      // Firing
      const wSpec = WEAPONS[weaponRef.current];
      if (inputRef.current.fire && nowMs - lastFireMs >= wSpec.cooldown) {
        lastFireMs = nowMs;
        fpWeapon.position.z = -0.42;
        soundFx.laser(weaponRef.current === 'snayper' ? 480 : 760);

        camera.getWorldDirection(rayDir);
        const muzzleWorld = camera.position.clone().add(rayDir.clone().multiplyScalar(0.8));
        const endWorld = camera.position.clone().add(rayDir.clone().multiplyScalar(32));
        spawnTracer(muzzleWorld, endWorld, wSpec.color);

        if (modeRef.current === 'online' && socket) {
          socket.emit('player:fire', {
            origin: [camera.position.x, camera.position.y, camera.position.z],
            dir: [rayDir.x, rayDir.y, rayDir.z],
            weapon: weaponRef.current,
          });
        } else if (modeRef.current === 'demo_bot' && !botFinished) {
          // Local Demo Bot hit test
          const targetCenter = opponentMesh.position.clone().add(new THREE.Vector3(0, 1.1, 0));
          const toTarget = targetCenter.clone().sub(camera.position);
          const proj = toTarget.dot(rayDir);
          if (proj > 0 && proj < 50) {
            const closest = camera.position.clone().add(rayDir.clone().multiplyScalar(proj));
            if (closest.distanceTo(targetCenter) <= 1.0) {
              soundFx.hit();
              botHp = Math.max(0, botHp - wSpec.damage);
              setHud((h) => ({ ...h, oppHp: botHp }));
              if (botHp <= 0) {
                myRoundsLocal += 1;
                if (myRoundsLocal >= 2 || roundLocal >= 3) {
                  botFinished = true;
                  soundFx.victory();
                  completePracticeMatch(selectedMap, myRoundsLocal, botRoundsLocal, true);
                  setSummary({ won: true, myRounds: myRoundsLocal, oppRounds: botRoundsLocal, reason: 'Demo Bot mag‘lub etildi', xp: 90 });
                  setPhase('summary');
                } else {
                  roundLocal += 1;
                  botHp = 100;
                  myHpLocal = 100;
                  myShieldLocal = 50;
                  roundTimerLocal = 90;
                  myPosRef.current = { x: -14, y: 0, z: -10 };
                  setHud({ myHp: 100, myShield: 50, oppHp: 100, myRounds: myRoundsLocal, oppRounds: botRoundsLocal, round: roundLocal, timer: 90, banner: `${roundLocal}-Raund!` });
                }
              }
            }
          }
        }
      }

      // Sync or Demo Bot AI
      if (modeRef.current === 'online') {
        if (socket && nowMs - lastSyncMs > 50) {
          lastSyncMs = nowMs;
          socket.emit('player:state', {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            yaw: yawRef.current,
            weapon: weaponRef.current,
          });
        }
        opponentMesh.position.x = THREE.MathUtils.damp(opponentMesh.position.x, oppTargetRef.current.x, 12, dt);
        opponentMesh.position.y = THREE.MathUtils.damp(opponentMesh.position.y, oppTargetRef.current.y, 12, dt);
        opponentMesh.position.z = THREE.MathUtils.damp(opponentMesh.position.z, oppTargetRef.current.z, 12, dt);
        opponentMesh.rotation.y = oppTargetRef.current.yaw + Math.PI;
      } else if (!botFinished) {
        botPhaseAngle += dt * 1.1;
        opponentMesh.position.x = Math.sin(botPhaseAngle) * 11;
        opponentMesh.position.z = 11 + Math.cos(botPhaseAngle * 0.7) * 5;
        opponentMesh.lookAt(pos.x, 0, pos.z);

        roundTimerLocal = Math.max(0, roundTimerLocal - dt);
        botFireCd -= dt;
        if (botFireCd <= 0) {
          botFireCd = 1.15;
          const botMuzzle = opponentMesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
          const aimAt = new THREE.Vector3(pos.x + (Math.random() - 0.5) * 1.8, 1.4, pos.z + (Math.random() - 0.5) * 1.8);
          spawnTracer(botMuzzle, aimAt, 0xff6b00);
          if (Math.random() < 0.45) {
            let dmg = 16;
            if (myShieldLocal > 0) {
              const abs = Math.min(myShieldLocal, 10);
              myShieldLocal -= abs;
              dmg -= abs;
            }
            myHpLocal = Math.max(0, myHpLocal - dmg);
            soundFx.hit();
            if (myHpLocal <= 0) {
              botRoundsLocal += 1;
              if (botRoundsLocal >= 2 || roundLocal >= 3) {
                botFinished = true;
                completePracticeMatch(selectedMap, myRoundsLocal, botRoundsLocal, false);
                setSummary({ won: false, myRounds: myRoundsLocal, oppRounds: botRoundsLocal, reason: 'Demo Bot raundlarni yutdi', xp: 35 });
                setPhase('summary');
              } else {
                roundLocal += 1;
                botHp = 100;
                myHpLocal = 100;
                myShieldLocal = 50;
                roundTimerLocal = 90;
                myPosRef.current = { x: -14, y: 0, z: -10 };
              }
            }
          }
          setHud((h) => ({
            ...h,
            myHp: myHpLocal,
            myShield: myShieldLocal,
            timer: Math.ceil(roundTimerLocal),
            myRounds: myRoundsLocal,
            oppRounds: botRoundsLocal,
            round: roundLocal,
          }));
        }
      }

      // Update tracers
      for (let i = tracers.length - 1; i >= 0; i--) {
        tracers[i].ttl -= dt;
        if (tracers[i].ttl <= 0) {
          scene.remove(tracers[i].mesh);
          tracers[i].mesh.geometry.dispose();
          (tracers[i].mesh.material as THREE.Material).dispose();
          tracers.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
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
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.dispose();
      if (dom.parentNode === container) container.removeChild(dom);
    };
  }, [phase, selectedMap, socket, completePracticeMatch]);

  const startOnlineQueue = () => {
    if (!socket) {
      notify('Real-vaqt serveri bilan aloqa o‘rnatilmoqda...', 'error');
      return;
    }
    soundFx.click();
    setMode('online');
    socket.emit('queue:join', { arenaMap: selectedMap });
  };

  const createPrivateRoom = () => {
    if (!socket) return;
    soundFx.click();
    setMode('online');
    socket.emit('room:create', { arenaMap: selectedMap });
  };

  const joinPrivateRoom = () => {
    if (!socket || !joinCodeInput.trim()) return;
    soundFx.click();
    setMode('online');
    socket.emit('room:join', { code: joinCodeInput.trim() });
  };

  const startDemoBotPractice = () => {
    soundFx.click();
    setMode('demo_bot');
    setOpponentName('Taktik Demo Bot');
    myPosRef.current = { x: -14, y: 0, z: -10 };
    yawRef.current = Math.PI * 0.75;
    setHud({
      myHp: 100,
      myShield: 50,
      oppHp: 100,
      myRounds: 0,
      oppRounds: 0,
      round: 1,
      timer: 90,
      banner: 'Mashq rejimi (Demo Bot)',
    });
    setSummary(null);
    setPhase('playing');
  };

  const currentMapMeta = ARENA_MAPS.find((m) => m.id === selectedMap) || ARENA_MAPS[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-[#00D2FF] mb-1">3D KO‘P O‘YINCHILI BELLASHUV</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            1v1 Kiber Arena
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Original xaritalar, futuristik energiya qurollari va raundli raqobat tizimi.
          </p>
        </div>

        {phase === 'playing' && (
          <button
            type="button"
            onClick={() => {
              if (socket) socket.emit('queue:leave');
              setPhase('lobby');
            }}
            className="px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-slate-200 hover:bg-white/5"
          >
            Arenadan chiqish
          </button>
        )}
      </div>

      {/* LOBBY PHASE */}
      {phase === 'lobby' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          {/* Map Selector */}
          <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">
              Arena xaritasini tanlang
            </h2>
            <div className="relative h-52 sm:h-64 rounded-xl overflow-hidden border border-white/10">
              <img
                src={currentMapMeta.image}
                alt={currentMapMeta.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090B11] via-[#090B11]/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="font-display text-xl font-bold text-white">{currentMapMeta.name}</div>
                <div className="text-xs text-slate-300 mt-0.5">{currentMapMeta.desc}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ARENA_MAPS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    soundFx.click();
                    setSelectedMap(m.id);
                  }}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    selectedMap === m.id
                      ? 'border-[#FF6B00] bg-[#FF6B00]/15 text-white'
                      : 'border-white/10 bg-[#121622] text-slate-400 hover:text-white'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Matchmaking & Private Room Controls */}
          <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold text-white">
                Bellashuv turini tanlang
              </h2>

              <button
                type="button"
                onClick={startOnlineQueue}
                className="w-full py-3.5 px-4 rounded-xl bg-[#FF6B00] hover:bg-[#FF7D1F] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Onlayn 1v1 Raqib Izlash</span>
              </button>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="text-xs font-medium text-slate-300">Do‘st bilan shaxsiy xona</div>
                <button
                  type="button"
                  onClick={createPrivateRoom}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#00D2FF]/40 bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 text-[#7DD3FC] font-semibold text-xs transition-colors"
                >
                  Shaxsiy Xona Ochish (Kod olish)
                </button>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="Xona kodi (masalan: A4B9C1)"
                    maxLength={8}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#121722] border border-white/10 text-xs font-mono text-white focus:border-[#00D2FF] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={joinPrivateRoom}
                    className="px-4 py-2 rounded-xl bg-[#182032] hover:bg-[#232E47] text-white text-xs font-semibold"
                  >
                    Kirish
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={startDemoBotPractice}
                className="w-full py-3 px-4 rounded-xl border border-white/15 bg-[#121622] hover:bg-white/5 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2"
              >
                <Bot className="w-4 h-4 text-[#FF6B00]" />
                <span>Mashq rejimi (Demo Bot bilan lokal sinov)</span>
              </button>
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Onlayn rejim real Socket.IO serveri orqali ulanadi; Mashq rejimi aniq Demo Bot sifatida ishlaydi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEARCHING OR PRIVATE ROOM WAIT */}
      {(phase === 'searching' || phase === 'private_wait') && (
        <div className="bg-[#0D1018] border border-white/10 rounded-2xl p-10 text-center max-w-lg mx-auto space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#00D2FF]/15 border border-[#00D2FF]/40 flex items-center justify-center text-[#00D2FF]">
            <Crosshair className="w-7 h-7 animate-spin" />
          </div>
          {phase === 'searching' ? (
            <>
              <h2 className="font-display text-xl font-bold text-white">
                {currentMapMeta.name} arenasi uchun raqib qidirilmoqda...
              </h2>
              <p className="text-xs text-slate-400">
                Boshqa o‘yinchi ulanganda 3 raundlik 1v1 jang avtomatik boshlanadi. Kutishni istamasangiz, Mashq rejimini sinab ko‘rishingiz mumkin.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-white">
                Shaxsiy xona tayyor!
              </h2>
              <p className="text-xs text-slate-400">Do‘stingizga ushbu kodni yuboring:</p>
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-[#121722] border border-[#FF6B00]/50">
                <span className="font-mono text-2xl font-bold tracking-widest text-[#FF6B00]">
                  {roomCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(roomCode);
                    notify('Xona kodi nusxalandi!', 'success');
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200"
                  title="Nusxalash"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={startDemoBotPractice}
              className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-semibold"
            >
              Demo Bot bilan mashq qilish
            </button>
            <button
              type="button"
              onClick={() => {
                socket?.emit('queue:leave');
                setPhase('lobby');
              }}
              className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 text-xs font-semibold"
            >
              Bekor qilish
            </button>
          </div>
        </div>
      )}

      {/* LIVE 3D ARENA VIEWPORT */}
      {phase === 'playing' && (
        <div className="space-y-3">
          {/* Top Competitive HUD */}
          <div className="grid grid-cols-3 items-center gap-3 bg-[#0C1018] border border-white/10 rounded-xl px-4 py-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-slate-400">Siz ({user?.username})</div>
                <div className="flex items-center gap-3 mt-0.5 font-mono font-bold">
                  <span className="text-emerald-400 flex items-center gap-1 tabular-nums">
                    <Heart className="w-3.5 h-3.5" /> {hud.myHp}
                  </span>
                  <span className="text-[#00D2FF] flex items-center gap-1 tabular-nums">
                    <Shield className="w-3.5 h-3.5" /> {hud.myShield}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="font-mono text-lg sm:text-xl font-bold text-white tabular-nums">
                {hud.myRounds} : {hud.oppRounds}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <span>{hud.round}-Raund</span>
                <span>·</span>
                <span className="font-mono text-[#FF6B00] flex items-center gap-0.5 tabular-nums">
                  <Clock className="w-3 h-3" /> {hud.timer}s
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-slate-400">
                {mode === 'demo_bot' ? 'Demo Bot (Mashq)' : opponentName}
              </div>
              <div className="font-mono font-bold text-[#FF6B00] mt-0.5 tabular-nums">
                HP: {hud.oppHp}
              </div>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="relative h-[420px] sm:h-[520px] rounded-2xl overflow-hidden border border-white/15 bg-[#050609]">
            <div ref={canvasMountRef} className="w-full h-full cursor-crosshair select-none" />

            {/* Crosshair */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 border border-[#00D2FF]/80 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#FF6B00]" />
              </div>
            </div>

            {/* Subtle Mode Label */}
            <div className="pointer-events-none absolute top-3 left-3 px-3 py-1 rounded-lg bg-black/70 border border-white/10 text-[11px] text-slate-300">
              {currentMapMeta.name} · {mode === 'demo_bot' ? 'Mashq rejimi (Demo Bot)' : 'Jonli 1v1 Onlayn'}
            </div>

            {/* Weapon Switcher Bottom Dock */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/80 border border-white/15 rounded-xl p-1.5">
              {(['karabin', 'snayper', 'pulemyot'] as WeaponType[]).map((wk, idx) => (
                <button
                  key={wk}
                  type="button"
                  onClick={() => setWeapon(wk)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    weapon === wk
                      ? 'bg-[#FF6B00] text-white'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {idx + 1}. {WEAPONS[wk].name}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile & Desktop Controls Helper Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0C1018] border border-white/10 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onPointerDown={() => (inputRef.current.left = true)}
                onPointerUp={() => (inputRef.current.left = false)}
                onPointerLeave={() => (inputRef.current.left = false)}
                className="w-10 h-10 rounded-lg bg-[#141A26] border border-white/10 flex items-center justify-center text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={() => (inputRef.current.fwd = true)}
                onPointerUp={() => (inputRef.current.fwd = false)}
                onPointerLeave={() => (inputRef.current.fwd = false)}
                className="w-10 h-10 rounded-lg bg-[#141A26] border border-white/10 flex items-center justify-center text-white"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={() => (inputRef.current.back = true)}
                onPointerUp={() => (inputRef.current.back = false)}
                onPointerLeave={() => (inputRef.current.back = false)}
                className="w-10 h-10 rounded-lg bg-[#141A26] border border-white/10 flex items-center justify-center text-white"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onPointerDown={() => (inputRef.current.right = true)}
                onPointerUp={() => (inputRef.current.right = false)}
                onPointerLeave={() => (inputRef.current.right = false)}
                className="w-10 h-10 rounded-lg bg-[#141A26] border border-white/10 flex items-center justify-center text-white"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <span className="hidden md:inline text-xs text-slate-400">
              WASD — yurish · Sichqonchani bosib sudrash — nishon va otish · Space — sakrash · 1/2/3 — qurollar
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (yawRef.current += 0.28)}
                className="px-3 h-10 rounded-lg bg-[#141A26] border border-white/10 text-xs text-slate-200"
              >
                ↺ Burilish
              </button>
              <button
                type="button"
                onClick={() => (yawRef.current -= 0.28)}
                className="px-3 h-10 rounded-lg bg-[#141A26] border border-white/10 text-xs text-slate-200"
              >
                ↻ Burilish
              </button>
              <button
                type="button"
                onPointerDown={() => (inputRef.current.fire = true)}
                onPointerUp={() => (inputRef.current.fire = false)}
                onPointerLeave={() => (inputRef.current.fire = false)}
                className="px-4 h-10 rounded-lg bg-[#FF6B00] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4" /> Otish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY / DEFEAT SCREEN */}
      {phase === 'summary' && summary && (
        <div className="bg-[#0D1018] border border-white/15 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-5">
          <div
            className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${
              summary.won
                ? 'bg-[#FF6B00]/15 border-[#FF6B00]/40 text-[#FF6B00]'
                : 'bg-slate-800 border-white/10 text-slate-300'
            }`}
          >
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              {summary.won ? 'G‘alaba! Siz arenani zabt etdingiz' : 'Mag‘lubiyat! Qayta urinib ko‘ring'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">{summary.reason}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-[#121622] border border-white/10 rounded-xl p-4">
            <div>
              <div className="text-xs text-slate-400">Raundlar hisobi</div>
              <div className="font-mono text-xl font-bold text-white tabular-nums">
                {summary.myRounds} : {summary.oppRounds}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Qo‘shilgan XP</div>
              <div className="font-mono text-xl font-bold text-[#00D2FF] tabular-nums">
                +{summary.xp} XP
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => (mode === 'demo_bot' ? startDemoBotPractice() : startOnlineQueue())}
              className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7D1F] text-white text-sm font-semibold flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Qayta bellashish
            </button>
            <button
              type="button"
              onClick={() => setPhase('lobby')}
              className="px-5 py-2.5 rounded-xl border border-white/15 text-slate-200 text-sm font-semibold"
            >
              Lobbi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
