import {
    inspectCurrentService,
    restartCurrentService,
    getCurrentServiceLogs
} from "./actions.js";
import { findServiceForDirectory } from "./detector.js";

export function printHelp() {
    console.log(`
ubuntu-service (v1) — Single service management for the current directory

Usage:
  npx ubuntu-service [command] [options]
  us [command] [options]

Commands:
  (default)            Inspect the systemd service running in the current directory
  status               Detailed status card for the current service
  restart              Restart only the service associated with the current directory
  logs [-n <count>]    View journalctl logs for the current service
  name                 Output only the service unit name (e.g. appointment.keshavsoft.com.service)
  port                 Output only the detected port (e.g. 3000)

Options:
  --dir <path>         Target a specific directory instead of process.cwd()
  --systemd-dir <path> Custom systemd unit directory (defaults to /etc/systemd/system)
  -n, --lines <count>  Number of log lines to show (default: 25)
  --json               Output machine-readable JSON
  -h, --help           Show this help message

Aliases:
  us                   Short alias for ubuntu-service

Examples:
  # Stand in your project folder and run:
  us
  us restart
  us logs -n 50
  us name
`);
}

export function runCli(argv = process.argv.slice(2)) {
    const isHelp = argv.includes("-h") || argv.includes("--help");
    if (isHelp) {
        printHelp();
        return 0;
    }

    const isJson = argv.includes("--json");

    // Parse options
    let targetDir = process.cwd();
    const dirIdx = argv.indexOf("--dir");
    if (dirIdx !== -1 && argv[dirIdx + 1]) {
        targetDir = argv[dirIdx + 1];
    }

    let systemdDir = null;
    const sysIdx = argv.indexOf("--systemd-dir");
    if (sysIdx !== -1 && argv[sysIdx + 1]) {
        systemdDir = argv[sysIdx + 1];
    }

    let logLines = 25;
    const nIdx = argv.findIndex(a => a === "-n" || a === "--lines");
    if (nIdx !== -1 && argv[nIdx + 1]) {
        const parsedN = parseInt(argv[nIdx + 1], 10);
        if (!isNaN(parsedN) && parsedN > 0) {
            logLines = parsedN;
        }
    }

    const options = { systemdDir };

    // Determine subcommand
    const positionalArgs = argv.filter((arg, i) => {
        if (arg.startsWith("-")) return false;
        if (i > 0 && (argv[i - 1] === "--dir" || argv[i - 1] === "--systemd-dir" || argv[i - 1] === "-n" || argv[i - 1] === "--lines")) {
            return false;
        }
        return true;
    });

    const command = positionalArgs[0] || "status";

    // Subcommand: name
    if (command === "name") {
        const detected = findServiceForDirectory(targetDir, options);
        if (isJson) {
            console.log(JSON.stringify(detected, null, 2));
        } else if (detected.found) {
            console.log(detected.unitName);
        } else {
            console.error(detected.message);
            return 1;
        }
        return 0;
    }

    // Subcommand: port
    if (command === "port") {
        const detected = findServiceForDirectory(targetDir, options);
        if (isJson) {
            console.log(JSON.stringify({ port: detected.port || null }, null, 2));
        } else if (detected.found && detected.port) {
            console.log(detected.port);
        } else if (detected.found) {
            console.log("No port configured or detected.");
        } else {
            console.error(detected.message);
            return 1;
        }
        return 0;
    }

    // Subcommand: restart
    if (command === "restart") {
        const res = restartCurrentService(targetDir, options);
        if (isJson) {
            console.log(JSON.stringify(res, null, 2));
            return res.restartResult && res.restartResult.success ? 0 : 1;
        }

        if (!res.found) {
            console.error(`\n❌ No systemd service found for directory:\n   ${res.targetDir}`);
            console.error(`\n💡 Tip: Verify that /etc/systemd/system/*.service contains WorkingDirectory=${res.targetDir}\n   Or run 'npx ubuntu-services' to see all services.`);
            return 1;
        }

        console.log(`\n===============================================================`);
        console.log(` 🔄 ubuntu-service restart`);
        console.log(`===============================================================`);
        console.log(` 📍 Directory:     ${res.targetDir}`);
        console.log(` 🎯 Service Unit:  ${res.unitName}`);
        console.log(`---------------------------------------------------------------`);

        if (res.restartResult && res.restartResult.success) {
            const st = res.restartResult.status || {};
            const stateText = st.isActive ? "🟢 active (running)" : `🟡 ${st.activeState || "unknown"}`;
            console.log(` ✅ Service successfully restarted!`);
            console.log(` ⚡ Status:        ${stateText}`);
            if (st.pid) console.log(` 🆔 Main PID:      ${st.pid}`);
            if (st.memory) console.log(` 💾 Memory:        ${st.memory}`);
            if (res.port) console.log(` 🌐 Port:          ${res.port}`);
            console.log(`===============================================================\n`);
            return 0;
        } else {
            console.error(` ❌ Restart failed!`);
            if (res.restartResult && res.restartResult.error) {
                console.error(` ⚠️  Error:         ${res.restartResult.error}`);
            }
            if (res.restartResult && res.restartResult.hint) {
                console.error(` 💡 Hint:          ${res.restartResult.hint}`);
            }
            console.log(`===============================================================\n`);
            return 1;
        }
    }

    // Subcommand: logs
    if (command === "logs" || command === "log") {
        const res = getCurrentServiceLogs(targetDir, logLines, options);
        if (isJson) {
            console.log(JSON.stringify(res, null, 2));
            return res.logsResult && res.logsResult.success ? 0 : 1;
        }

        if (!res.found) {
            console.error(`\n❌ No systemd service found for directory:\n   ${res.targetDir}`);
            return 1;
        }

        console.log(`\n📜 Logs for ${res.unitName} (last ${logLines} lines):`);
        console.log(`---------------------------------------------------------------`);
        if (res.logsResult && res.logsResult.success) {
            console.log(res.logsResult.output || "(No recent logs)");
        } else {
            console.error(res.logsResult?.error || "Failed to retrieve logs");
        }
        console.log(`---------------------------------------------------------------\n`);
        return 0;
    }

    // Default / status command
    const info = inspectCurrentService(targetDir, options);

    if (isJson) {
        console.log(JSON.stringify(info, null, 2));
        return info.found ? 0 : 1;
    }

    if (!info.found) {
        console.error(`\n===============================================================`);
        console.error(` 🔍 ubuntu-service — No Service Match`);
        console.error(`===============================================================`);
        console.error(` 📍 Current Directory: ${info.targetDir}`);
        console.error(` ❌ Status:            No systemd service found for this folder.`);
        console.error(`---------------------------------------------------------------`);
        console.error(` 💡 Troubleshooting:`);
        console.error(`    1. Ensure a service unit file in /etc/systemd/system/ has:`);
        console.error(`       WorkingDirectory=${info.targetDir}`);
        console.error(`    2. Run 'npx ubuntu-services' to list all registered services.`);
        console.error(`    3. If service uses a different path, test with:`);
        console.error(`       us --dir /path/to/folder`);
        console.error(`===============================================================\n`);
        return 1;
    }

    const live = info.liveStatus || {};
    let statusBadge = "⚪ unknown";
    if (live.available) {
        if (live.isActive) {
            statusBadge = `🟢 active (${live.subState || "running"})`;
        } else if (live.activeState === "failed") {
            statusBadge = `🔴 failed (${live.subState})`;
        } else {
            statusBadge = `🟡 ${live.activeState || "inactive"} (${live.subState || "dead"})`;
        }
    } else {
        statusBadge = "⚪ unqueried (systemctl unavailable)";
    }

    console.log(`\n===============================================================`);
    console.log(` 🎯 ubuntu-service — Single Service Card`);
    console.log(`===============================================================`);
    console.log(` 📍 Directory:     ${info.targetDir}`);
    console.log(` 🎯 Service Unit:  ${info.unitName}`);
    console.log(` ⚡ State:         ${statusBadge}`);
    if (live.pid) console.log(` 🆔 Main PID:      ${live.pid}`);
    if (live.memory) console.log(` 💾 Memory:        ${live.memory}`);
    if (info.port) console.log(` 🌐 Port:          ${info.port}`);
    console.log(` 📁 WorkingDir:    ${info.workingDirectory || "-"} ${info.workingDirectoryExists ? "✅" : "❌ (missing)"}`);
    console.log(` 🚀 ExecStart:     ${info.execStart || "-"}`);
    if (info.description) console.log(` 📝 Description:   ${info.description}`);
    console.log(` 🔍 Match Reason:  ${info.matchType} (confidence: ${info.score}%)`);
    console.log(`---------------------------------------------------------------`);
    console.log(` 💡 Quick Actions:`);
    console.log(`    us restart       Restart this single service`);
    console.log(`    us logs          View recent journalctl logs`);
    console.log(`    us name          Output unit name`);
    console.log(`===============================================================\n`);

    return 0;
}
