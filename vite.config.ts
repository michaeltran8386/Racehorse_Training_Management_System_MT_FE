import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // npm run dev tự mở trình duyệt ở landing.
  server: { open: "/landing.html" },
  resolve: {
    // "@/..." trỏ tới thư mục src (khớp với "paths" trong tsconfig.json)
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
