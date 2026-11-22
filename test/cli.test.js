import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runCli } from "../src/v1/cli.js";

describe("cli.js", () => {
    let tmpDir;
    let systemdDir;
    let appDir;

    before(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "us-cli-test-"));
        systemdDir = path.join(tmpDir, "systemd");
        appDir = path.join(tmpDir, "app");

        fs.mkdirSync(systemdDir, { recursive: true });
        fs.mkdirSync(appDir, { recursive: true });

        fs.writeFileSync(path.join(systemdDir, "my-app.keshavsoft.com.service"), `
[Unit]
Description=My Sample App

[Service]
WorkingDirectory=${appDir.replace(/\\/g, "/")}
ExecStart=/usr/bin/node ${appDir.replace(/\\/g, "/")}/index.js
Environment="PORT=9090"
        `.trim());
    });

    after(() => {
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test("--help returns 0", () => {
        const code = runCli(["--help"]);
        assert.equal(code, 0);
    });

    test("name subcommand returns 0 and outputs unit name", () => {
        let logged = "";
        const origLog = console.log;
        console.log = (msg) => { logged += msg; };

        try {
            const code = runCli(["name", "--dir", appDir, "--systemd-dir", systemdDir]);
            assert.equal(code, 0);
            assert.equal(logged.trim(), "my-app.keshavsoft.com.service");
        } finally {
            console.log = origLog;
        }
    });

    test("port subcommand outputs detected port", () => {
        let logged = "";
        const origLog = console.log;
        console.log = (msg) => { logged += msg; };

        try {
            const code = runCli(["port", "--dir", appDir, "--systemd-dir", systemdDir]);
            assert.equal(code, 0);
            assert.equal(logged.trim(), "9090");
        } finally {
            console.log = origLog;
        }
    });

    test("--json outputs valid JSON payload", () => {
        let logged = "";
        const origLog = console.log;
        console.log = (msg) => { logged += msg; };

        try {
            const code = runCli(["--json", "--dir", appDir, "--systemd-dir", systemdDir]);
            assert.equal(code, 0);
            const parsed = JSON.parse(logged);
            assert.equal(parsed.found, true);
            assert.equal(parsed.unitName, "my-app.keshavsoft.com.service");
            assert.equal(parsed.port, 9090);
        } finally {
            console.log = origLog;
        }
    });

    test("returns exit code 1 for unmatched folder", () => {
        const emptyDir = path.join(tmpDir, "empty");
        fs.mkdirSync(emptyDir, { recursive: true });

        const code = runCli(["--dir", emptyDir, "--systemd-dir", systemdDir]);
        assert.equal(code, 1);
    });
});
