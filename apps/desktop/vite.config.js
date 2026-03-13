import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { sentrySvelteKit } from '@sentry/sveltekit'

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
// @ts-expect-error
export default defineConfig(async () => ({
  plugins: [
    sentrySvelteKit({
      org: 'oss-projects',
      project: 'soundscape',
    }),
    tailwindcss(),
    sveltekit()
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1422,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1423,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
