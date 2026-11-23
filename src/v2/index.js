import { parseServiceFile, detectPort } from "./parser.js";
import {
    findServiceForDirectory,
    normalizePath,
    inspectDirectoryMetadata,
    DEFAULT_SYSTEMD_DIRS
} from "./detector.js";
import {
    isSystemctlAvailable,
    getServiceLiveStatus,
    restartService,
    getServiceLogs
} from "./systemctl.js";
import {
    inspectCurrentService,
    restartCurrentService,
    getCurrentServiceLogs
} from "./actions.js";
import { runCli, printHelp } from "./cli.js";

export {
    parseServiceFile,
    detectPort,
    findServiceForDirectory,
    normalizePath,
    inspectDirectoryMetadata,
    DEFAULT_SYSTEMD_DIRS,
    isSystemctlAvailable,
    getServiceLiveStatus,
    restartService,
    getServiceLogs,
    inspectCurrentService,
    restartCurrentService,
    getCurrentServiceLogs,
    runCli,
    printHelp
};

export default {
    parseServiceFile,
    detectPort,
    findServiceForDirectory,
    normalizePath,
    inspectDirectoryMetadata,
    DEFAULT_SYSTEMD_DIRS,
    isSystemctlAvailable,
    getServiceLiveStatus,
    restartService,
    getServiceLogs,
    inspectCurrentService,
    restartCurrentService,
    getCurrentServiceLogs,
    runCli,
    printHelp
};
