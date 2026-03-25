/**
 * Prisma seed entry (CommonJS). Delegates to `seed-users.ts` so adapter + bcrypt stay in one place.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const seedTs = path.join(__dirname, 'seed-users.ts');

const result = spawnSync('npx', ['tsx', seedTs], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
