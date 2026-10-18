import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@parakh/contracts": path.resolve(__dirname, "../../packages/contracts/src/index.ts"),
      "@parakh/assessment": path.resolve(__dirname, "../../packages/assessment/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
