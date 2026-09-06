import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Vite's `root` defaults to process.cwd(), not this config file's own
    // directory — must be explicit now that `npm run build`/`dev` invoke
    // this config via `--config apps/tenant/vite.config.ts` from the repo
    // root, or index.html (which lives alongside this file) is never found.
    root: __dirname,
    // [Bug fix — branding/favicon assets missing from every production
    // build] Vite's `publicDir` defaults to `<root>/public` — since
    // `root` is `apps/tenant` (above), that resolved to
    // `apps/tenant/public/`, which has never existed; the actual
    // static assets (branding/, favicons, loading/) live at the
    // REPO-ROOT `public/`, exactly like `build.outDir` below is
    // already explicitly resolved back to the repo root for its own,
    // analogous reason. Confirmed directly: a real `vite build` before
    // this fix produced a `dist/` containing only `assets/` and
    // `index.html` — no branding folder, no favicons, no loading
    // background at all. Every <img>/CSS reference to these paths
    // (AppLoadingScreen.tsx, AuthView.tsx, index.html's own favicon
    // links) was correctly written; the files simply never reached the
    // server that serves them, so every one of these requests 404'd in
    // production.
    publicDir: path.resolve(__dirname, '../../public'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Shared types package (Payment/Subscription shapes) — plain TS,
        // no build step. apps/superadmin resolves the same alias to the
        // same file; neither app imports the other's src/ directly.
        '@sabush/shared-types': path.resolve(__dirname, '../../packages/shared-types/index.ts'),
      },
    },
    // apps/tenant/vite.config.ts moved here from the repo root (ADR-0005
    // / Rule 8 Assessment migration, Phase 2). `root` defaults to this
    // config file's own directory (apps/tenant), so every existing
    // relative import inside src/ is unaffected. `build.outDir` is
    // pinned back to the repo-root `dist/` — the one thing that must
    // NOT move, since server/index.ts's `distPath =
    // path.resolve(__dirname, 'dist')` (server.js, bundled to the repo
    // root by esbuild) and Railway's existing deploy both assume dist/
    // lives at the repo root. This is a build-output path only, not an
    // app boundary — apps/tenant's *source* and *bundle contents* are
    // still fully separate from apps/superadmin's.
    build: {
      outDir: path.resolve(__dirname, '../../dist'),
      emptyOutDir: true,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // The privileged staff-deletion endpoint lives on the Express server
      // (server/index.ts), run separately in dev via `npm run dev:server`.
      // Proxy /api so the SPA can call it with a relative path in both
      // dev and production.
      proxy: {
        '/api': {
          target: process.env.API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
