#!/usr/bin/env node
// Local mock of the two THACO back-ends for running the app without VPN / real accounts.
// Usage: npm run mock:api   (parcel service on :4001, room service on :4002)
// Login: any seeded username (khoa.nm, nhung.vh, ha.tt, …) with password 123456 (MOCK_PASSWORD).
const path = require('node:path');
const fs = require('node:fs');

const { createServer } = require('./lib');
const { createCommon } = require('./common');
const { createParcelService } = require('./parcel');
const { createRoomService } = require('./room');

const uploadDir = path.join(__dirname, '.uploads');
fs.mkdirSync(uploadDir, { recursive: true });
for (const file of fs.readdirSync(path.join(__dirname, 'samples'))) {
  fs.copyFileSync(path.join(__dirname, 'samples', file), path.join(uploadDir, file));
}

const parcelCommon = createCommon('parcel');
const roomCommon = createCommon('room');
const roomRoutes = createRoomService(roomCommon);

createServer({
  name: 'parcel',
  port: Number(process.env.PARCEL_PORT || 4001),
  uploadDir,
  authenticate: parcelCommon.authenticate,
  routes: [...parcelCommon.routes(), ...createParcelService(parcelCommon)],
});

createServer({
  name: 'room',
  port: Number(process.env.ROOM_PORT || 4002),
  uploadDir,
  authenticate: roomCommon.authenticate,
  routes: [...roomCommon.routes(), ...roomRoutes],
});
