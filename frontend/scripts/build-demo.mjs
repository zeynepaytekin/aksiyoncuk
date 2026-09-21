import { spawnSync } from "node:child_process";

const nextExecutable = process.platform === "win32" ? "next.cmd" : "next";
const result = spawnSync(nextExecutable, ["build"], {
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
