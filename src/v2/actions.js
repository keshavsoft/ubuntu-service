import { findServiceForDirectory } from "./detector.js";
import { getServiceLiveStatus, restartService, getServiceLogs } from "./systemctl.js";

/**
 * High-level action to inspect the service for the current or target directory.
 */
export function inspectCurrentService(targetDir = process.cwd(), options = {}) {
    const detected = findServiceForDirectory(targetDir, options);
    if (!detected.found) {
        return detected;
    }

    const liveStatus = getServiceLiveStatus(detected.unitName);
    return {
        ...detected,
        liveStatus
    };
}

/**
 * High-level action to restart the service associated with current or target directory.
 */
export function restartCurrentService(targetDir = process.cwd(), options = {}) {
    const detected = findServiceForDirectory(targetDir, options);
    if (!detected.found) {
        return {
            success: false,
            error: detected.message,
            targetDir
        };
    }

    const restartResult = restartService(detected.unitName);
    return {
        ...detected,
        restartResult
    };
}

/**
 * High-level action to get logs of the service associated with current or target directory.
 */
export function getCurrentServiceLogs(targetDir = process.cwd(), lines = 25, options = {}) {
    const detected = findServiceForDirectory(targetDir, options);
    if (!detected.found) {
        return {
            success: false,
            error: detected.message,
            targetDir
        };
    }

    const logsResult = getServiceLogs(detected.unitName, lines);
    return {
        ...detected,
        logsResult
    };
}
