import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// apps/superadmin — the physically separate application ADR-0005 / §9.1
// requires. This config, its build output, and its dependency graph
// share nothing at the bundle level with apps/tenant/vite.config.ts:
// no cross-app relative imports are permitted (only @sabush/shared-types
// crosses the boundary, and it is plain, dependency-free TypeScript —
// see packages/shared-types/index.ts's own header). NFR-1 requires this
// app's production bundle to contain zero references to apps/tenant;
// see docs/engineering/18-19-payment-operations-rule8-assessment.md
// Risk 3 for the enforcement approach (no cross-app relative imports,
// checked here structurally by there being no relative path in this
// app that could even resolve into apps/tenant/src).
export default defineConfig(() => {
  return {
    root: __dirname,
    plugins: [react()],
    resolve: {
      alias: {
        '@sabush/shared-types': path.resolve(__dirname, '../../packages/shared-types/index.ts'),
      },
    },
    // Deliberately NOT dist/ (that's apps/tenant's output, served by
    // server/index.ts's express.static(distPath) — see that file). This
    // app's build output is a separate static site with no server
    // wiring in this repository yet; see the Rule 8 Assessment / final
    // report for the deployment-target limitation this implies.
    build: {
      outDir: path.resolve(__dirname, '../../dist-superadmin'),
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/api': {
          target: process.env.API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
