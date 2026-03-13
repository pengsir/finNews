import "dotenv/config";
import { runDailyPipeline } from "@/server/jobs/run-daily-pipeline";

async function main() {
  const result = await runDailyPipeline("CLI");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
