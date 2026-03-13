import { config as loadEnv } from "dotenv";
import { spawn } from "node:child_process";

const [, , command, ...args] = process.argv;

if (!command) {
  throw new Error("Usage: node scripts/with-env-dev.mjs <command> [...args]");
}

loadEnv({ path: ".env.dev", override: true });

const child = spawn(command, args, {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
