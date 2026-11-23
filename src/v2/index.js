export { parseServiceFile, detectPort, findServiceForDirectory, normalizePath, inspectDirectoryMetadata, DEFAULT_SYSTEMD_DIRS } from "ubuntu-service-detect";
export { isSystemctlAvailable, getServiceLiveStatus, restartService, getServiceLogs } from "ubuntu-service-restart";
export {
    inspectCurrentService,
    restartCurrentService,
    getCurrentServiceLogs
} from "./actions.js";
export { runCli, printHelp } from "./cli.js";

import { inspectCurrentService } from "./actions.js";
export default inspectCurrentService;
