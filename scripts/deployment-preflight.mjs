import { checkDeploymentEnvironment } from "./lib/deployment-environment.mjs";
const problems = checkDeploymentEnvironment(process.env);
if (problems.length) {
  console.error("Hosted configuration is incomplete:");
  for (const problem of problems) console.error("- " + problem);
  process.exitCode = 1;
} else console.log("PASS: hosted configuration shape validated. Provider access, OAuth callbacks, SMTP, storage and hosted smoke checks still require live verification. No keys were printed.");
