import fs from "node:fs";
import path from "node:path";
import { parseServiceFile, detectPort } from "./parser.js";

export const DEFAULT_SYSTEMD_DIRS = [
    "/etc/systemd/system",
    "/run/systemd/system",
    "/usr/lib/systemd/system",
    "/lib/systemd/system"
];

/**
 * Normalizes a directory path for reliable cross-platform comparison.
 * Resolves symlinks if the path exists.
 */
export function normalizePath(p) {
    if (!p) return "";
    let resolved = path.resolve(p);
    try {
        if (fs.existsSync(resolved)) {
            resolved = fs.realpathSync(resolved);
        }
    } catch {
        // Fall back to resolved if realpath fails
    }
    // Normalize slashes to forward slashes for unified comparison
    let normalized = resolved.replace(/\\/g, "/");
    if (normalized.endsWith("/") && normalized.length > 1) {
        normalized = normalized.slice(0, -1);
    }
    return normalized;
}

/**
 * Inspects a directory for package.json or git config metadata.
 */
export function inspectDirectoryMetadata(dirPath) {
    const meta = {
        name: null,
        gitRemote: null
    };

    if (!dirPath || !fs.existsSync(dirPath)) {
        return meta;
    }

    // Check package.json
    const pkgPath = path.join(dirPath, "package.json");
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
            meta.name = pkg.name || null;
        } catch {
            // ignore malformed JSON
        }
    }

    // Check .git/config
    const gitConfigPath = path.join(dirPath, ".git", "config");
    if (fs.existsSync(gitConfigPath)) {
        try {
            const gitConfig = fs.readFileSync(gitConfigPath, "utf-8");
            const m = gitConfig.match(/url\s*=\s*.*github\.com[/:]([^/\s]+\/[^\s.]+)/i);
            if (m) {
                meta.gitRemote = m[1];
            }
        } catch {
            // ignore git config error
        }
    }

    return meta;
}

/**
 * Finds the single systemd service that owns or runs from the given directory.
 * @param {string} [targetDir] - Directory to check (defaults to process.cwd())
 * @param {object} [options] - Options ({ systemdDir })
 * @returns {object} Result with matched service or not found status
 */
export function findServiceForDirectory(targetDir = process.cwd(), options = {}) {
    const normTarget = normalizePath(targetDir);
    const meta = inspectDirectoryMetadata(targetDir);

    const dirsToScan = options.systemdDir
        ? [path.resolve(options.systemdDir)]
        : DEFAULT_SYSTEMD_DIRS;

    const matchedUnits = [];

    for (const scanDir of dirsToScan) {
        if (!fs.existsSync(scanDir)) continue;

        let files = [];
        try {
            files = fs.readdirSync(scanDir).filter(f => f.endsWith(".service"));
        } catch {
            continue;
        }

        for (const file of files) {
            const filePath = path.join(scanDir, file);
            const parsed = parseServiceFile(filePath);
            if (!parsed) continue;

            const serviceSection = parsed.Service || {};
            const unitSection = parsed.Unit || {};
            const workingDir = serviceSection.WorkingDirectory;
            const execStart = serviceSection.ExecStart || "";

            let matchType = null;
            let score = 0;

            if (workingDir) {
                const normWorking = normalizePath(workingDir);
                if (normWorking === normTarget) {
                    matchType = "exact_working_directory";
                    score = 100;
                } else if (normTarget.startsWith(normWorking + "/") || normWorking.startsWith(normTarget + "/")) {
                    matchType = "subpath_working_directory";
                    score = 80;
                }
            }

            if (!matchType && execStart) {
                const rawExec = Array.isArray(execStart) ? execStart.join(" ") : String(execStart);
                const normExec = rawExec.replace(/\\/g, "/");
                if (normExec.includes(normTarget)) {
                    matchType = "exec_start_path";
                    score = 70;
                }
            }

            // Fallback: match by package name or directory basename against service name
            if (!matchType) {
                const baseName = path.basename(normTarget).toLowerCase();
                const unitBase = file.replace(/\.service$/, "").toLowerCase();

                if (meta.name && unitBase.includes(meta.name.toLowerCase())) {
                    matchType = "package_name_match";
                    score = 50;
                } else if (unitBase.includes(baseName) || baseName.includes(unitBase)) {
                    matchType = "directory_name_match";
                    score = 40;
                }
            }

            if (matchType) {
                const port = detectPort(parsed, workingDir);
                matchedUnits.push({
                    unitName: file,
                    filePath,
                    systemdDir: scanDir,
                    matchType,
                    score,
                    workingDirectory: workingDir || null,
                    workingDirectoryExists: workingDir ? fs.existsSync(workingDir) : false,
                    execStart,
                    description: unitSection.Description || null,
                    port,
                    serviceConfig: parsed
                });
            }
        }
    }

    if (matchedUnits.length === 0) {
        return {
            found: false,
            targetDir: normTarget,
            message: `No systemd service unit found matching directory '${normTarget}'`
        };
    }

    // Sort by best score
    matchedUnits.sort((a, b) => b.score - a.score);
    const primary = matchedUnits[0];

    return {
        found: true,
        targetDir: normTarget,
        unitName: primary.unitName,
        filePath: primary.filePath,
        systemdDir: primary.systemdDir,
        matchType: primary.matchType,
        score: primary.score,
        workingDirectory: primary.workingDirectory,
        workingDirectoryExists: primary.workingDirectoryExists,
        execStart: primary.execStart,
        description: primary.description,
        port: primary.port,
        allMatches: matchedUnits.length > 1 ? matchedUnits : undefined,
        serviceConfig: primary.serviceConfig
    };
}
