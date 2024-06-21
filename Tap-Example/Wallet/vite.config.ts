import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm';
// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import path from "path"
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), nodePolyfills()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext' //browsers can handle the latest ES features
  },
  server: {
    proxy: {
      '/rpcapi': {
        target: 'http://127.0.0.1:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpcapi/, 'api')
      },
      '/unisatapi': {
        target: 'https://open-api.unisat.io/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/unisatapi/, '')
      },
      '/opentap-regtest': {
        target: 'http://user:pass@127.0.0.1:18443',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/opentap-regtest/, '')
      },
      '/ord-regtest': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ord-regtest/, '')
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      },
      // Enable esbuild polyfill plugins
      plugins: [
        // NodeGlobalsPolyfillPlugin({
        //   buffer: true
        // })
      ]
    }
  }
})
