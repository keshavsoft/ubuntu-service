import { execSync } from "node:child_process";

/**
 * Checks if systemctl command is available in the environment.
 */
export function isSystemctlAvailable() {
    try {
        execSync("which systemctl", { stdio: "pipe" });
        return true;
    } catch {
        return false;
    }
}

/**
 * Queries systemctl for the live status of a service.
 * @param {string} unitName - Name of the service unit (e.g. appointment.keshavsoft.com.service)
 * @returns {object} Status details
 */
export function getServiceLiveStatus(unitName) {
    if (!isSystemctlAvailable()) {
        return {
            available: false,
            activeState: "unknown",
            subState: "unknown",
            pid: null,
            memory: null,
            uptime: null,
            raw: "systemctl not available on this platform"
        };
    }

    try {
        const showOutput = execSync(
            `systemctl show ${unitName} --property=ActiveState,SubState,MainPID,ExecMainStartTimestamp,MemoryCurrent`,
            { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
        );

        const props = {};
        for (const line of showOutput.split(/\r?\n/)) {
            const eq = line.indexOf("=");
            if (eq !== -1) {
                props[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
            }
        }

        const activeState = props.ActiveState || "unknown";
        const subState = props.SubState || "unknown";
        const mainPid = props.MainPID ? parseInt(props.MainPID, 10) : 0;
        const startTime = props.ExecMainStartTimestamp || null;

        let memoryFormatted = null;
        if (props.MemoryCurrent && props.MemoryCurrent !== "[not set]") {
            const bytes = parseInt(props.MemoryCurrent, 10);
            if (!isNaN(bytes) && bytes > 0) {
                memoryFormatted = (bytes / (1024 * 1024)).toFixed(1) + " MB";
            }
        }

        return {
            available: true,
            activeState,
            subState,
            isActive: activeState === "active",
            pid: mainPid > 0 ? mainPid : null,
            memory: memoryFormatted,
            startTime,
            raw: showOutput
        };
    } catch (err) {
        return {
            available: true,
            activeState: "failed_to_query",
            subState: "error",
            isActive: false,
            pid: null,
            memory: null,
            error: err.message
        };
    }
}

/**
 * Restarts a systemd service unit via systemctl restart.
 * @param {string} unitName - Service unit name
 * @returns {object} Execution result
 */
export function restartService(unitName) {
    if (!isSystemctlAvailable()) {
        return {
            success: false,
            error: "systemctl is not available in this environment (must run on Ubuntu Linux with systemd)"
        };
    }

    try {
        execSync(`systemctl restart ${unitName}`, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"]
        });
        const freshStatus = getServiceLiveStatus(unitName);
        return {
            success: true,
            unitName,
            status: freshStatus
        };
    } catch (err) {
        const msg = err.stderr ? err.stderr.toString() : err.message;
        let hint = null;
        if (msg.includes("Access denied") || msg.includes("interactive authentication")) {
            hint = "Permission denied: try running with sudo (e.g., sudo npx ubuntu-service restart)";
        }
        return {
            success: false,
            unitName,
            error: msg.trim(),
            hint
        };
    }
}

/**
 * Fetches recent systemd journal logs for a service.
 * @param {string} unitName - Service unit name
 * @param {number} [lines=25] - Number of lines to retrieve
 * @returns {object} Logs result
 */
export function getServiceLogs(unitName, lines = 25) {
    try {
        const output = execSync(`journalctl -u ${unitName} -n ${lines} --no-pager`, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"]
        });
        return {
            success: true,
            unitName,
            lines,
            output: output.trim()
        };
    } catch (err) {
        return {
            success: false,
            unitName,
            error: err.stderr ? err.stderr.toString().trim() : err.message
        };
    }
}
