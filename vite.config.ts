import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
  const isLib = mode === "lib";

  return {
    plugins: [
      react(),
      ...(isLib
        ? [
            dts({
              tsconfigPath: "./tsconfig.lib.json",
              rollupTypes: true,
            }),
          ]
        : []),
    ],
    build: isLib
      ? {
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            formats: ["es"],
            fileName: "index",
          },
          copyPublicDir: false,
          rollupOptions: {
            external: (id: string) =>
              id === "react" ||
              id === "react-dom" ||
              id.startsWith("react/") ||
              id.startsWith("react-dom/") ||
              id === "three" ||
              id.startsWith("three/"),
          },
        }
      : {},
  };
});
