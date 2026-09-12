import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initWebsocket } from "./websocket";
import { startOverdueJob } from "./jobs/overdueJob";

const app = createApp();
const httpServer = http.createServer(app);

initWebsocket(httpServer);
startOverdueJob();

httpServer.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Velozity API listening on port ${env.port} [${env.nodeEnv}]`);
});
