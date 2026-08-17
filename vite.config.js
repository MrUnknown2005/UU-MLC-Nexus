import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    // Your app builds successfully; this just raises
    // the warning threshold for larger production chunks.
    chunkSizeWarningLimit: 700,
  },
});