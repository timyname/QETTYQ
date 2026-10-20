import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Task-local vendor executables are not application source; src/tests remain fully checked.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "data/snapshots/**", "sites/**", "tmp/**", "playwright-report/**", "test-results/**"]),
]);
