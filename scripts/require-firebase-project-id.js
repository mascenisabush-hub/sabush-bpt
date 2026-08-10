#!/usr/bin/env node
'use strict';

// Pilot safety fix #2 — Firestore rules/index deployment safety.
//
// Guards npm run deploy:firestore:rules / deploy:firestore:indexes.
// Refuses to proceed unless FIREBASE_PROJECT_ID is explicitly set in the
// environment — never falls back to "whatever project the Firebase CLI
// happens to have selected locally" (`firebase use`'s current default),
// which is exactly the failure mode that could silently deploy to the
// wrong project (or a project meant for local testing) instead of the
// real production one.
//
// This repository has no .firebaserc and does not define the production
// Firebase project ID anywhere in version control by design — that value
// lives only in the real deployment environment (see README.md's
// "Production (Railway)" section: VITE_FIREBASE_* values are set directly
// in Railway's dashboard, external to this repo). This script does not
// know, guess, or default that value; it only refuses to let a deploy
// proceed without it, matching this repo's established fail-safe
// convention (see .env.example's VITE_ENABLE_DEMO_TOOLS: "if missing or
// ambiguous, the safer path must win").
//
// This script now also OWNS the actual `firebase deploy` invocation
// (rather than only validating and handing off to a shell-interpolated
// command in package.json). The original package.json scripts read:
//
//   firebase deploy --only firestore:rules --project "$FIREBASE_PROJECT_ID"
//
// `$FIREBASE_PROJECT_ID` is POSIX shell syntax. npm on Windows runs
// scripts through cmd.exe by default, where `$FIREBASE_PROJECT_ID` is not
// a variable reference at all — it is passed to the Firebase CLI
// literally, producing "Invalid project id: $FIREBASE_PROJECT_ID" even
// when the variable is set correctly. Moving the entire invocation into
// Node (which reads process.env identically on every platform, and
// builds the argv array directly rather than a shell command string)
// removes shell interpolation from the deployment path entirely.

import { spawnSync } from 'node:child_process';

const projectId = process.env.FIREBASE_PROJECT_ID;

if (!projectId || projectId.trim() === '') {
  console.error(
    '\n' +
    'FIREBASE_PROJECT_ID is not set — refusing to deploy.\n' +
    '\n' +
    'This command deploys to a real Firebase project and must never rely on\n' +
    'whatever project the Firebase CLI happens to have selected locally.\n' +
    '\n' +
    'Run again with the real production project ID explicitly, e.g.:\n' +
    '\n' +
    '  FIREBASE_PROJECT_ID=your-real-project-id npm run deploy:firestore:rules\n' +
    '\n' +
    'Find the correct project ID in the Firebase Console (Project Settings\n' +
    '> General > Project ID) or in this app\'s Railway environment variables\n' +
    '(VITE_FIREBASE_PROJECT_ID) — do not guess it.\n'
  );
  process.exit(1);
}

const ALLOWED_TARGETS = new Set(['firestore:rules', 'firestore:indexes']);
const target = process.argv[2];

if (!target || !ALLOWED_TARGETS.has(target)) {
  console.error(
    '\n' +
    'Missing or unrecognized deploy target.\n' +
    '\n' +
    'Usage:\n' +
    '  node scripts/require-firebase-project-id.js firestore:rules\n' +
    '  node scripts/require-firebase-project-id.js firestore:indexes\n'
  );
  process.exit(1);
}

console.log(`FIREBASE_PROJECT_ID is set (${projectId}) — proceeding.`);

// Build the Firebase CLI invocation as a real argv array — never a shell
// command string — so the project ID reaches the CLI as one discrete
// argument no matter what shell (or lack of one) is involved.
const firebaseArgs = ['deploy', '--only', target, '--project', projectId];

// On Windows, npm/Firebase CLI binaries resolve to `.cmd` shims, and
// Node's child_process cannot execute `.bat`/`.cmd` files directly without
// `shell: true` (this is documented Node.js behavior, not a workaround —
// CreateProcess has no native way to run a script file, only PE
// executables). On POSIX, `firebase` is a real executable/shebang script,
// so no shell is needed or used. `shell` is therefore only ever true on
// win32; the project ID and every other arg stay as separate array
// elements in both cases, so there is still no string concatenation of
// the project ID into a command line.
const isWindows = process.platform === 'win32';

const result = spawnSync('firebase', firebaseArgs, {
  stdio: 'inherit',
  shell: isWindows,
});

if (result.error) {
  console.error(`\nFailed to invoke the Firebase CLI: ${result.error.message}\n`);
  if (result.error.code === 'ENOENT') {
    console.error('Is firebase-tools installed? Try: npm install\n');
  }
  process.exit(1);
}

// Propagate the Firebase CLI's real exit code. A null status means the
// process was killed by a signal rather than exiting normally — treat
// that as a failure too.
process.exit(result.status === null ? 1 : result.status);
