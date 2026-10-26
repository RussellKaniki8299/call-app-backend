/**
 * Test de fumée sans dépendances réseau : faux `io`/`socket`, `dotenv` simulé.
 * Lancer : node test/smoke.test.js
 */
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (['dotenv', 'axios', 'sharp', 'fluent-ffmpeg', 'multer', 'socket.io'].includes(request)) return request;
  return origResolve.call(this, request, ...rest);
};
const stubs = {
  dotenv: { config() {} },
  axios: { create: () => ({ post: async () => ({}) }), post: async () => ({}) },
};
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (stubs[request]) return stubs[request];
  if (['sharp', 'fluent-ffmpeg', 'multer', 'socket.io'].includes(request)) return {};
  return origLoad.call(this, request, ...rest);
};

process.env.CALL_RING_TIMEOUT_MS = '50';
process.env.ROOM_MAX_PARTICIPANTS = '2';
process.env.ROOM_CLEANUP_DELAY_MS = '50';

const assert = require('assert');

// ── Faux io / sockets
const emitted = []; // { room, event, payload }
const sockets = new Map();
const makeSocket = (id) => {
  const handlers = {};
  const s = {
    id, rooms: new Set(), handlers,
    on: (e, fn) => { handlers[e] = handlers[e] || []; handlers[e].push(fn); },
    emit: (event, payload) => emitted.push({ room: `socket:${id}`, event, payload }),
    join: (r) => s.rooms.add(r),
    leave: (r) => s.rooms.delete(r),
    to: (r) => ({ emit: (event, payload) => emitted.push({ room: r, event, payload, from: id }) }),
    broadcast: { emit: (event, payload) => emitted.push({ room: '*', event, payload, from: id }) },
    fire: (e, ...args) => (handlers[e] || []).forEach((fn) => fn(...args)),
  };
  sockets.set(id, s);
  return s;
};
const fakeIo = {
  sockets: { sockets },
  to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }),
  emit: (event, payload) => emitted.push({ room: '*', event, payload }),
};
require('./../src/services/realtime.service').init(fakeIo);

const presence = require('../src/store/presence.store');
const presenceH = require('../src/sockets/handlers/presence.handler');
const callH = require('../src/sockets/handlers/call.handler');
const roomH = require('../src/sockets/handlers/room.handler');
const streamH = require('../src/sockets/handlers/stream.handler');
const signaling = require('../src/sockets/handlers/signaling.handler');
const chatH = require('../src/sockets/handlers/chat.handler');
const find = (event, room) => emitted.filter((e) => e.event === event && (!room || e.room === room));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wire = (s) => { presenceH.register(s); chatH(s); callH.register(s); roomH.register(s); signaling(s); streamH.register(s); };
const disconnect = (s) => { const ctx = presence.remove(s.id); presenceH.onDisconnect(s, ctx); callH.onDisconnect(s, ctx); roomH.onDisconnect(s); streamH.onDisconnect(s); sockets.delete(s.id); };

(async () => {
  // 1. Présence multi-appareils
  const a1 = makeSocket('a1'), a2 = makeSocket('a2'), b1 = makeSocket('b1');
  [a1, a2, b1].forEach(wire);
  a1.fire('register-user', 1); a2.fire('join-user', 1); b1.fire('register-user', 2);
  assert.strictEqual(find('user-online').length, 2, 'user-online émis 1 fois par utilisateur');
  assert(presence.isOnline(1) && presence.isOnline(2));
  console.log('✔ présence multi-sockets');

  // 2. Chat privé : les 2 parties + refresh
  emitted.length = 0;
  a1.fire('send-private-message', { fromUserId: 1, toUserId: 2, message: 'salut' });
  assert.strictEqual(find('receive-private-message', 'user:2')[0].payload.sender, 'Lui/Elle');
  assert.strictEqual(find('receive-private-message', 'user:1')[0].payload.sender, 'Vous');
  assert.strictEqual(find('update-correspondant-list').length, 2);
  console.log('✔ chat privé');

  // 3. Appel : occupé, accepté, fin
  emitted.length = 0;
  a1.fire('call-user', { fromUser: { id: 1 }, toUser: 2, callType: 'video', roomId: 'r1' });
  assert.strictEqual(find('incoming-call', 'user:2').length, 1);
  const c1 = makeSocket('c1'); wire(c1); c1.fire('register-user', 3);
  c1.fire('call-user', { fromUser: 3, toUser: 2, callType: 'audio', roomId: 'r2' });
  assert.strictEqual(find('user-busy', 'socket:c1').length, 1, 'user-busy si appelé déjà sollicité');
  b1.fire('accept-call', { fromUserId: 1, toUserId: 2, roomId: 'r1', callType: 'video' });
  assert.strictEqual(find('call-accepted', 'user:1').length, 1);
  c1.fire('call-user', { fromUser: 3, toUser: 1, callType: 'audio', roomId: 'r3' });
  assert.strictEqual(find('user-busy', 'socket:c1').length, 2, 'user-busy si appelé en communication');
  console.log('✔ appels : sonnerie / occupé / décroché');

  // 4. Déconnexion d'un interlocuteur => call-ended pour l'autre
  emitted.length = 0;
  disconnect(b1);
  assert.strictEqual(find('call-ended', 'user:1').length, 1);
  console.log('✔ fin d\'appel à la déconnexion');

  // 5. Timeout de sonnerie
  const d1 = makeSocket('d1'), e1 = makeSocket('e1'); wire(d1); wire(e1);
  d1.fire('register-user', 4); e1.fire('register-user', 5);
  emitted.length = 0;
  d1.fire('call-user', { fromUser: 4, toUser: 5, callType: 'audio', roomId: 'r9' });
  await sleep(120);
  assert.strictEqual(find('call-cancelled', 'user:5').length, 1);
  assert.strictEqual(find('call-error', 'user:4').length, 1);
  console.log('✔ timeout de sonnerie');

  // 6. Rooms : join, plein, quitter, nettoyage
  const r1 = makeSocket('r1'), r2 = makeSocket('r2'), r3 = makeSocket('r3');
  [r1, r2, r3].forEach(wire);
  emitted.length = 0;
  r1.fire('join-room', { roomId: 'R', userInfo: { prenom: 'Ann' } });
  r2.fire('join-room', { roomId: 'R', userInfo: { prenom: 'Bob' } });
  r3.fire('join-room', { roomId: 'R', userInfo: { prenom: 'Cid' } });
  assert.strictEqual(find('room-full', 'socket:r3').length, 1);
  const joined = find('user-joined', 'R').map((e) => e.payload).find((p) => p.userId === 'r2');
  assert(joined && joined.userInfo && joined.userInfo.prenom === 'Bob', 'user-joined contient userInfo');
  r1.fire('room-message', { senderId: 1, roomId: 'R', message: 'yo', user: { prenom: 'Ann' } });
  assert.strictEqual(find('room-message', 'R').length, 1);
  emitted.length = 0;
  disconnect(r1);
  const left = find('user-left', 'R')[0].payload;
  assert(left.userId === 'r1' && left.message.includes('Ann'), 'user-left au format objet');
  console.log('✔ rooms : plein / userInfo / user-left');

  // 7. Signalisation : relais + ignore socket inconnue
  emitted.length = 0;
  r2.fire('offer', { offer: { sdp: 'x' }, to: 'r3' });
  r2.fire('offer', { offer: { sdp: 'x' }, to: 'ghost' });
  assert.strictEqual(find('offer').length, 1);
  assert.strictEqual(find('offer')[0].payload.from, 'r2');
  console.log('✔ signalisation WebRTC');

  // 8. Streaming
  const bc = makeSocket('bc'), v1 = makeSocket('v1'); wire(bc); wire(v1);
  let streamId; bc.fire('start-stream', (id) => { streamId = id; });
  assert.strictEqual(streamId, 'bc');
  emitted.length = 0;
  v1.fire('join-stream', { streamId });
  assert.strictEqual(find('viewer-connected', 'bc')[0].payload, 'v1');
  v1.fire('join-stream', { streamId: 'nope' });
  assert.strictEqual(find('stream-not-found', 'socket:v1').length, 1);
  disconnect(bc);
  assert.strictEqual(find('stream-ended').length, 1);
  console.log('✔ streaming');

  console.log('\nTous les tests passent');
  process.exit(0);
})().catch((e) => { console.error('✘', e.message); console.error(e.stack.split('\n').slice(0,4).join('\n')); process.exit(1); });
