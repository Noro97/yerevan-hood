import { startServer as start } from "../../scripts/studio_server.mjs";

/** Static server for the repo root on 127.0.0.1 (studio saving disabled). */
export const startServer = () => start({ allowSave: false });
