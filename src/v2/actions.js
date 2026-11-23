import { findServiceForDirectory } from "ubuntu-service-detect";
import { getServiceLiveStatus, restartService, getServiceLogs } from "ubuntu-service-restart";

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
