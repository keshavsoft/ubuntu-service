import fs from "node:fs";
import path from "node:path";

/**
 * Parses a systemd .service INI file into structured sections.
 * @param {string} filePath - Absolute path to .service file
 * @returns {object} Parsed service configuration
 */
export function parseServiceFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    const result = {
        Unit: {},
        Service: {},
        Install: {},
        raw: content
    };

    let currentSection = null;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#") || line.startsWith(";")) {
            continue;
        }

        const sectionMatch = line.match(/^\[(.*?)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1];
            if (!result[currentSection]) {
                result[currentSection] = {};
            }
            continue;
        }

        const eqIdx = line.indexOf("=");
        if (eqIdx !== -1 && currentSection) {
            const key = line.slice(0, eqIdx).trim();
            let value = line.slice(eqIdx + 1).trim();

            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            if (result[currentSection][key] !== undefined) {
                if (Array.isArray(result[currentSection][key])) {
                    result[currentSection][key].push(value);
                } else {
                    result[currentSection][key] = [result[currentSection][key], value];
                }
            } else {
                result[currentSection][key] = value;
            }
        }
    }

    return result;
}

/**
 * Extracts port numbers from Environment strings, ExecStart args, or .env files.
 * @param {object} parsedConfig - Output from parseServiceFile
 * @param {string} [workingDir] - Service working directory
 * @returns {number|null} Detected port or null
 */
export function detectPort(parsedConfig, workingDir) {
    if (!parsedConfig) return null;
    const service = parsedConfig.Service || {};

    // 1. Check Environment key(s)
    const envs = service.Environment;
    if (envs) {
        const envList = Array.isArray(envs) ? envs : [envs];
        for (const e of envList) {
            const portMatch = e.match(/(?:PORT|LISTEN_PORT|APP_PORT)\s*=\s*(\d{2,5})/i);
            if (portMatch) {
                return parseInt(portMatch[1], 10);
            }
        }
    }

    // 2. Check ExecStart for --port 3000, -p 3000, or port number
    const execStart = service.ExecStart;
    if (execStart) {
        const execMatch = execStart.match(/(?:--port|-p)\s+([0-9]{2,5})/i);
        if (execMatch) {
            return parseInt(execMatch[1], 10);
        }
    }

    // 3. Check .env file in WorkingDirectory if it exists
    const dir = workingDir || service.WorkingDirectory;
    if (dir && fs.existsSync(dir)) {
        const envFilePath = path.join(dir, ".env");
        if (fs.existsSync(envFilePath)) {
            try {
                const envContent = fs.readFileSync(envFilePath, "utf-8");
                const m = envContent.match(/(?:PORT|APP_PORT|SERVER_PORT)\s*=\s*(\d{2,5})/i);
                if (m) {
                    return parseInt(m[1], 10);
                }
            } catch {
                // ignore unreadable .env
            }
        }
    }

    return null;
}
