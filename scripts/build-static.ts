// Builds the static site for GitHub Pages into out/:  npm run build:static
//   NEXT_PUBLIC_BASE_PATH=/setu NEXT_PUBLIC_REPO_URL=https://github.com/<user>/setu npm run build:static
//
// Routes that need a server are named *.server.tsx / *.server.ts; with NEXT_PUBLIC_STATIC_EXPORT=1, next.config.ts
// leaves that suffix out of pageExtensions, so they don't become routes. What replaces them: src/lib/deploy.ts.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const env = {
  ...process.env,
  NEXT_PUBLIC_STATIC_EXPORT: "1",
  NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  NEXT_PUBLIC_REPO_URL: process.env.NEXT_PUBLIC_REPO_URL ?? "",
};
console.log(`static build · base path "${env.NEXT_PUBLIC_BASE_PATH || "/"}" · mistake reports → ${env.NEXT_PUBLIC_REPO_URL || "(off)"}`);
const pre = spawnSync(process.execPath, [join(ROOT, "scripts", "build-public.ts")], { cwd: ROOT, env, stdio: "inherit" });
if (pre.status !== 0) process.exit(pre.status ?? 1);
const res = spawnSync(process.execPath, [join(ROOT, "node_modules", "next", "dist", "bin", "next"), "build"], { cwd: ROOT, env, stdio: "inherit" });
// GitHub Pages: serve folders that start with "_" (Next.js puts its files in _next/) as they are.
if (res.status === 0) writeFileSync(join(ROOT, "out", ".nojekyll"), "");
process.exit(res.status ?? 1);
