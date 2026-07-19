import { defineConfig } from "vite";

// Static-site build: everything inlines into dist/ for drop-on-Vercel/Netlify deploys.
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    cssCodeSplit: false,
  },
});
