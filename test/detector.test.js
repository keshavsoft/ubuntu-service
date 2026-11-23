import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { findServiceForDirectory, normalizePath } from "../src/index.js";

describe("detector.js", () => {
    let tmpDir;
    let systemdDir;
    let projectA;
    let projectB;

    before(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "us-detector-test-"));
        systemdDir = path.join(tmpDir, "systemd");
        projectA = path.join(tmpDir, "projects", "appointment-notifier");
        projectB = path.join(tmpDir, "projects", "quotation");

        fs.mkdirSync(systemdDir, { recursive: true });
        fs.mkdirSync(projectA, { recursive: true });
        fs.mkdirSync(projectB, { recursive: true });

        // Add package.json to projectA
        fs.writeFileSync(path.join(projectA, "package.json"), JSON.stringify({
            name: "appointment-notifier-v1"
        }));

        // Service file for Project A (matching by exact WorkingDirectory)
        fs.writeFileSync(path.join(systemdDir, "appointment.keshavsoft.com.service"), `
[Unit]
Description=Appointment Notifier Node Service

[Service]
WorkingDirectory=${projectA.replace(/\\/g, "/")}
ExecStart=/usr/bin/node ${projectA.replace(/\\/g, "/")}/app.js
Environment="PORT=3000"
Restart=always
        `.trim());

        // Service file for Project B (matching by ExecStart)
        fs.writeFileSync(path.join(systemdDir, "quotation.service"), `
[Unit]
Description=Quotation Service

[Service]
ExecStart=/usr/bin/node ${projectB.replace(/\\/g, "/")}/server.js --port 3025
Restart=always
        `.trim());
    });

    after(() => {
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test("matches service by exact WorkingDirectory", () => {
        const result = findServiceForDirectory(projectA, { systemdDir });
        assert.equal(result.found, true);
        assert.equal(result.unitName, "appointment.keshavsoft.com.service");
        assert.equal(result.matchType, "exact_working_directory");
        assert.equal(result.port, 3000);
        assert.equal(result.workingDirectoryExists, true);
    });

    test("matches service by ExecStart path when WorkingDirectory is omitted", () => {
        const result = findServiceForDirectory(projectB, { systemdDir });
        assert.equal(result.found, true);
        assert.equal(result.unitName, "quotation.service");
        assert.equal(result.matchType, "exec_start_path");
        assert.equal(result.port, 3025);
    });

    test("returns found: false when directory has no matching service", () => {
        const unmanagedDir = path.join(tmpDir, "unmanaged-folder");
        fs.mkdirSync(unmanagedDir, { recursive: true });

        // Service file with multiple ExecStart lines (Array in INI parser)
        fs.writeFileSync(path.join(systemdDir, "multi-exec.service"), `
[Unit]
Description=Multi ExecStart Service

[Service]
ExecStart=/bin/true
ExecStart=/usr/bin/node /some/other/path/app.js
        `.trim());

        const result = findServiceForDirectory(unmanagedDir, { systemdDir });
        assert.equal(result.found, false);
        assert.ok(result.message.includes("No systemd service"));
    });

    test("normalizes paths consistently", () => {
        const p1 = normalizePath(projectA);
        const p2 = normalizePath(projectA + path.sep);
        assert.equal(p1, p2);
    });
});
