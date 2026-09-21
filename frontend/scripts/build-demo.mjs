import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const nextExecutable = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const result = spawnSync(process.execPath, [nextExecutable, "build"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NEXT_PUBLIC_DEMO_MODE: "true",
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
