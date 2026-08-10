#!/usr/bin/env node
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
// This script performs no deployment itself and is inert unless invoked
// by one of the two deploy:firestore:* npm scripts above it.

if (!process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID.trim() === '') {
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

console.log(`FIREBASE_PROJECT_ID is set (${process.env.FIREBASE_PROJECT_ID}) — proceeding.`);
