import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import crypto from 'crypto';
import { verifySessionToken } from './auth.ts';
import { hubStore } from './store.ts';
import { ArenaMapId } from '../src/types/hub.ts';

interface PlayerRuntime {
  socketId: string;
  userId: string;
  username: string;
  avatarId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  shield: number;
  roundWins: number;
  lastFireAt: number;
  weapon: 'karabin' | 'snayper' | 'pulemyot';
}

interface ArenaRoom {
  id: string;
  code: string;
  arenaMap: ArenaMapId;
  players: PlayerRuntime[];
  round: number;
  roundSecondsLeft: number;
  status: 'waiting' | 'active' | 'finished';
  timerHandle?: NodeJS.Timeout;
  isPrivate: boolean;
}

const WEAPON_SPECS = {
  karabin: { cooldownMs: 130, damage: 22, range: 60 },
  snayper: { cooldownMs: 700, damage: 65, range: 95 },
  pulemyot: { cooldownMs: 90, damage: 14, range: 48 },
};

const ROUND_TIME_SEC = 90;

export function setupMultiplayer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: false, // Same-origin in preview/prod
    },
    transports: ['websocket', 'polling'],
  });

  const waitingQueue = new Map<ArenaMapId, Socket[]>();
  const rooms = new Map<string, ArenaRoom>();
  const codeToRoomId = new Map<string, string>();
  const socketToRoomId = new Map<string, string>();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Avtorizatsiya tokeni topilmadi.'));
    }
    const payload = verifySessionToken(token);
    if (!payload) {
      return next(new Error('Sessiya yaroqsiz.'));
    }
    const user = hubStore.getUserById(payload.userId);
    if (!user) {
      return next(new Error('Foydalanuvchi topilmadi.'));
    }
    socket.data.userId = user.id;
    socket.data.username = user.username;
    socket.data.avatarId = user.avatarId;
    next();
  });

  function cleanupQueue(socketId: string) {
    for (const [map, list] of waitingQueue.entries()) {
      waitingQueue.set(
        map,
        list.filter((s) => s.id !== socketId)
      );
    }
  }

  function createRuntime(socket: Socket, spawnIndex: number): PlayerRuntime {
    return {
      socketId: socket.id,
      userId: socket.data.userId,
      username: socket.data.username,
      avatarId: socket.data.avatarId,
      x: spawnIndex === 0 ? -14 : 14,
      y: 0,
      z: spawnIndex === 0 ? -10 : 10,
      yaw: spawnIndex === 0 ? Math.PI * 0.75 : -Math.PI * 0.25,
      hp: 100,
      shield: 50,
      roundWins: 0,
      lastFireAt: 0,
      weapon: 'karabin',
    };
  }

  function startMatch(room: ArenaRoom) {
    room.status = 'active';
    room.round = 1;
    room.roundSecondsLeft = ROUND_TIME_SEC;

    io.to(room.id).emit('match:started', {
      roomId: room.id,
      code: room.code,
      arenaMap: room.arenaMap,
      round: room.round,
      roundSecondsLeft: room.roundSecondsLeft,
      players: room.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        avatarId: p.avatarId,
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: p.yaw,
        hp: p.hp,
        shield: p.shield,
        roundWins: p.roundWins,
      })),
    });

    if (room.timerHandle) clearInterval(room.timerHandle);
    room.timerHandle = setInterval(() => {
      if (room.status !== 'active') return;
      room.roundSecondsLeft -= 1;
      if (room.roundSecondsLeft <= 0) {
        // Round timeout: player with higher HP+shield wins round
        const [p1, p2] = room.players;
        if (p1 && p2) {
          const s1 = p1.hp + p1.shield;
          const s2 = p2.hp + p2.shield;
          const winner = s1 >= s2 ? p1 : p2;
          advanceRound(room, winner.userId, 'Vaqt tugadi');
        }
      } else {
        io.to(room.id).emit('match:timer', { roundSecondsLeft: room.roundSecondsLeft });
      }
    }, 1000);
  }

  function advanceRound(room: ArenaRoom, winnerUserId: string, reason: string) {
    const winner = room.players.find((p) => p.userId === winnerUserId);
    if (winner) winner.roundWins += 1;

    const matchWinner = room.players.find((p) => p.roundWins >= 2);
    if (matchWinner || room.round >= 3) {
      const finalWinner =
        matchWinner ||
        (room.players[0].roundWins >= room.players[1].roundWins
          ? room.players[0]
          : room.players[1]);
      finishMatch(room, finalWinner.userId, reason);
      return;
    }

    room.round += 1;
    room.roundSecondsLeft = ROUND_TIME_SEC;
    room.players.forEach((p, idx) => {
      p.hp = 100;
      p.shield = 50;
      p.x = idx === 0 ? -14 : 14;
      p.y = 0;
      p.z = idx === 0 ? -10 : 10;
      p.yaw = idx === 0 ? Math.PI * 0.75 : -Math.PI * 0.25;
    });

    io.to(room.id).emit('match:round_end', {
      roundWinnerUserId: winnerUserId,
      reason,
      nextRound: room.round,
      roundSecondsLeft: room.roundSecondsLeft,
      players: room.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: p.yaw,
        hp: p.hp,
        shield: p.shield,
        roundWins: p.roundWins,
      })),
    });
  }

  function finishMatch(room: ArenaRoom, winnerUserId: string, reason: string) {
    room.status = 'finished';
    if (room.timerHandle) {
      clearInterval(room.timerHandle);
      room.timerHandle = undefined;
    }

    const [p1, p2] = room.players;
    if (p1 && p2) {
      const p1Won = p1.userId === winnerUserId;
      const p1Xp = p1Won ? 160 : 55;
      const p2Xp = !p1Won ? 160 : 55;

      hubStore.recordMatchOrGame(p1.userId, {
        arenaMap: room.arenaMap,
        mode: '1v1 Online',
        opponentName: p2.username,
        playerScore: p1.roundWins,
        opponentScore: p2.roundWins,
        result: p1Won ? 'G‘alaba' : 'Mag‘lubiyat',
        xpEarned: p1Xp,
      });

      hubStore.recordMatchOrGame(p2.userId, {
        arenaMap: room.arenaMap,
        mode: '1v1 Online',
        opponentName: p1.username,
        playerScore: p2.roundWins,
        opponentScore: p1.roundWins,
        result: !p1Won ? 'G‘alaba' : 'Mag‘lubiyat',
        xpEarned: p2Xp,
      });
    }

    io.to(room.id).emit('match:ended', {
      winnerUserId,
      reason,
      players: room.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        roundWins: p.roundWins,
        xpEarned: p.userId === winnerUserId ? 160 : 55,
      })),
    });

    // Clean up room mapping
    room.players.forEach((p) => socketToRoomId.delete(p.socketId));
    codeToRoomId.delete(room.code);
    rooms.delete(room.id);
  }

  io.on('connection', (socket) => {
    io.emit('hub:online_count', { count: io.sockets.sockets.size });

    socket.on('queue:join', ({ arenaMap }: { arenaMap: ArenaMapId }) => {
      cleanupQueue(socket.id);
      const validMap: ArenaMapId = arenaMap || 'cyber_city';
      const list = waitingQueue.get(validMap) || [];
      const opponent = list.find((s) => s.connected && s.data.userId !== socket.data.userId);

      if (opponent) {
        waitingQueue.set(
          validMap,
          list.filter((s) => s.id !== opponent.id)
        );
        const roomId = `room-${crypto.randomUUID()}`;
        const code = crypto.randomBytes(3).toString('hex').toUpperCase();
        const room: ArenaRoom = {
          id: roomId,
          code,
          arenaMap: validMap,
          players: [createRuntime(opponent, 0), createRuntime(socket, 1)],
          round: 1,
          roundSecondsLeft: ROUND_TIME_SEC,
          status: 'active',
          isPrivate: false,
        };
        rooms.set(roomId, room);
        codeToRoomId.set(code, roomId);
        socketToRoomId.set(opponent.id, roomId);
        socketToRoomId.set(socket.id, roomId);

        opponent.join(roomId);
        socket.join(roomId);
        startMatch(room);
      } else {
        list.push(socket);
        waitingQueue.set(validMap, list);
        socket.emit('queue:waiting', { arenaMap: validMap });
      }
    });

    socket.on('queue:leave', () => {
      cleanupQueue(socket.id);
    });

    socket.on('room:create', ({ arenaMap }: { arenaMap: ArenaMapId }) => {
      cleanupQueue(socket.id);
      const roomId = `room-${crypto.randomUUID()}`;
      const code = crypto.randomBytes(3).toString('hex').toUpperCase();
      const validMap: ArenaMapId = arenaMap || 'cyber_city';
      const room: ArenaRoom = {
        id: roomId,
        code,
        arenaMap: validMap,
        players: [createRuntime(socket, 0)],
        round: 1,
        roundSecondsLeft: ROUND_TIME_SEC,
        status: 'waiting',
        isPrivate: true,
      };
      rooms.set(roomId, room);
      codeToRoomId.set(code, roomId);
      socketToRoomId.set(socket.id, roomId);
      socket.join(roomId);
      socket.emit('room:created', { code, arenaMap: validMap });
    });

    socket.on('room:join', ({ code }: { code: string }) => {
      const normalized = String(code || '').trim().toUpperCase();
      const roomId = codeToRoomId.get(normalized);
      if (!roomId) {
        return socket.emit('room:error', { message: 'Bunday xona kodi topilmadi.' });
      }
      const room = rooms.get(roomId);
      if (!room || room.status !== 'waiting' || room.players.length >= 2) {
        return socket.emit('room:error', { message: 'Xona to‘lgan yoki yakunlangan.' });
      }
      if (room.players[0].userId === socket.data.userId) {
        return socket.emit('room:error', { message: 'O‘z xonangizga raqib sifatida kira olmaysiz.' });
      }

      cleanupQueue(socket.id);
      room.players.push(createRuntime(socket, 1));
      socketToRoomId.set(socket.id, roomId);
      socket.join(roomId);
      startMatch(room);
    });

    socket.on(
      'player:state',
      (data: { x: number; y: number; z: number; yaw: number; weapon?: 'karabin' | 'snayper' | 'pulemyot' }) => {
        const roomId = socketToRoomId.get(socket.id);
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'active') return;

        const me = room.players.find((p) => p.socketId === socket.id);
        if (!me) return;

        // Server-side bounds anti-cheat clamp
        me.x = Math.max(-25, Math.min(25, Number(data.x) || 0));
        me.y = Math.max(0, Math.min(5, Number(data.y) || 0));
        me.z = Math.max(-25, Math.min(25, Number(data.z) || 0));
        me.yaw = Number(data.yaw) || 0;
        if (data.weapon && WEAPON_SPECS[data.weapon]) {
          me.weapon = data.weapon;
        }

        socket.to(roomId).emit('opponent:state', {
          userId: me.userId,
          x: me.x,
          y: me.y,
          z: me.z,
          yaw: me.yaw,
          weapon: me.weapon,
        });
      }
    );

    socket.on(
      'player:fire',
      (data: {
        origin: [number, number, number];
        dir: [number, number, number];
        weapon: 'karabin' | 'snayper' | 'pulemyot';
      }) => {
        const roomId = socketToRoomId.get(socket.id);
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'active') return;

        const shooter = room.players.find((p) => p.socketId === socket.id);
        const target = room.players.find((p) => p.socketId !== socket.id);
        if (!shooter || !target) return;

        const weaponKey = WEAPON_SPECS[data.weapon] ? data.weapon : 'karabin';
        const spec = WEAPON_SPECS[weaponKey];
        const now = Date.now();
        // Anti-cheat fire rate validation
        if (now - shooter.lastFireAt < spec.cooldownMs * 0.8) {
          return;
        }
        shooter.lastFireAt = now;

        // Ray-capsule intersection check against opponent's authoritative position
        const ox = Number(data.origin?.[0] ?? shooter.x);
        const oy = Number(data.origin?.[1] ?? shooter.y + 1.45);
        const oz = Number(data.origin?.[2] ?? shooter.z);
        const dx = Number(data.dir?.[0] ?? 0);
        const dy = Number(data.dir?.[1] ?? 0);
        const dz = Number(data.dir?.[2] ?? -1);
        const len = Math.hypot(dx, dy, dz) || 1;
        const nx = dx / len;
        const ny = dy / len;
        const nz = dz / len;

        const tx = target.x;
        const ty = target.y + 1.1;
        const tz = target.z;

        const vx = tx - ox;
        const vy = ty - oy;
        const vz = tz - oz;
        const tProj = vx * nx + vy * ny + vz * nz;

        let hit = false;
        if (tProj > 0 && tProj < spec.range) {
          const cx = ox + nx * tProj;
          const cy = oy + ny * tProj;
          const cz = oz + nz * tProj;
          const distXZ = Math.hypot(cx - tx, cz - tz);
          const distY = Math.abs(cy - ty);
          if (distXZ <= 0.85 && distY <= 1.2) {
            hit = true;
          }
        }

        io.to(roomId).emit('match:shot', {
          shooterUserId: shooter.userId,
          origin: [ox, oy, oz],
          dir: [nx, ny, nz],
          weapon: weaponKey,
          hit,
        });

        if (hit) {
          let dmg = spec.damage;
          if (target.shield > 0) {
            const absorbed = Math.min(target.shield, Math.ceil(dmg * 0.6));
            target.shield -= absorbed;
            dmg -= absorbed;
          }
          target.hp = Math.max(0, target.hp - dmg);

          io.to(roomId).emit('match:damage', {
            targetUserId: target.userId,
            hp: target.hp,
            shield: target.shield,
            attackerUserId: shooter.userId,
          });

          if (target.hp <= 0) {
            advanceRound(room, shooter.userId, `${shooter.username} raqibni yengdi`);
          }
        }
      }
    );

    socket.on('disconnect', () => {
      cleanupQueue(socket.id);
      const roomId = socketToRoomId.get(socket.id);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          const survivor = room.players.find((p) => p.socketId !== socket.id);
          if (room.status === 'active' && survivor) {
            finishMatch(room, survivor.userId, 'Raqib aloqani uzdi');
          } else {
            if (room.timerHandle) clearInterval(room.timerHandle);
            codeToRoomId.delete(room.code);
            rooms.delete(roomId);
          }
        }
        socketToRoomId.delete(socket.id);
      }
      io.emit('hub:online_count', { count: io.sockets.sockets.size });
    });
  });

  return io;
}
