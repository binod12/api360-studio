import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(() => {
  const isExtension = process.env.BUILD_TARGET === 'vscode';
  return {
    plugins: isExtension ? [react(), viteSingleFile()] : [react()],
    build: {
      outDir: isExtension ? '../api360-vscode/webview-dist' : 'dist',
      emptyOutDir: true,
    }
  }
});
