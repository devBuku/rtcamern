import { CronJob } from "cron";
import http from "node:http";
import https from "node:https";
import { FRONTEND_URL } from "../constants/env";
import { OK } from "../constants/http-status";

const job = new CronJob("*/14 * * * *", function () {
  const url = new URL("/health", FRONTEND_URL).href;
  const client = url.startsWith("https:") ? https : http;

  const req = client.get(url, (res) => {
    if (res.statusCode === OK) console.log("GET request sent successfully");
    else console.log("GET request failed", res.statusCode);
  });

  req.setTimeout(10000, () => {
    req.destroy();
    console.error("Health check request timed out");
  });

  req.on("error", (e) => console.error("Error while sending request", e));
});

export default job;
