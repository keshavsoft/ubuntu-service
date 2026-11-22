import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseServiceFile, detectPort } from "../src/v1/parser.js";

describe("parser.js", () => {
    let tmpDir;

    before(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "us-parser-test-"));
    });

    after(() => {
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test("parses standard systemd service file with Environment and ExecStart", () => {
        const file = path.join(tmpDir, "test.service");
        fs.writeFileSync(file, `
[Unit]
Description="Sample Test Service"
After=network.target

[Service]
WorkingDirectory="/var/www/sample"
ExecStart=/usr/bin/node /var/www/sample/index.js --port 8080
Restart=always
Environment="PORT=8080"
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
        `.trim());

        const parsed = parseServiceFile(file);
        assert.ok(parsed);
        assert.equal(parsed.Unit.Description, "Sample Test Service");
        assert.equal(parsed.Unit.After, "network.target");
        assert.equal(parsed.Service.WorkingDirectory, "/var/www/sample");
        assert.equal(parsed.Service.Restart, "always");
        assert.ok(Array.isArray(parsed.Service.Environment));
        assert.equal(parsed.Service.Environment.length, 2);

        const port = detectPort(parsed, "/var/www/sample");
        assert.equal(port, 8080);
    });

    test("detects port from .env file when not in Environment section", () => {
        const appDir = path.join(tmpDir, "app-with-env");
        fs.mkdirSync(appDir, { recursive: true });
        fs.writeFileSync(path.join(appDir, ".env"), "PORT=4500\nDB=test");

        const file = path.join(tmpDir, "app.service");
        fs.writeFileSync(file, `
[Unit]
Description=App

[Service]
WorkingDirectory=${appDir.replace(/\\/g, "/")}
ExecStart=/usr/bin/node server.js
        `.trim());

        const parsed = parseServiceFile(file);
        const port = detectPort(parsed, appDir);
        assert.equal(port, 4500);
    });

    test("returns null for non-existent service file", () => {
        const parsed = parseServiceFile(path.join(tmpDir, "does-not-exist.service"));
        assert.equal(parsed, null);
    });
});
