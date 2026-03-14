import "dotenv/config";
import { runDailyPipeline } from "@/server/jobs/run-daily-pipeline";

async function main() {
  const triggerSource = process.env.PIPELINE_TRIGGER_SOURCE ?? "CLI";
  const result = await runDailyPipeline(triggerSource);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
