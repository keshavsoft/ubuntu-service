# ubuntu-service

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/package/ubuntu-service)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)
[![Organization](https://img.shields.io/badge/org-KeshavSoft-purple.svg)](https://github.com/keshavsoft)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](https://github.com/keshavsoft/ubuntu-service)

> **Context-aware single service manager for Ubuntu VPS.**  
> Automatically identifies the systemd service associated with your current working directory (`process.cwd()`), inspects its status, restarts it, and displays its logs. Zero memory needed—run right after `git pull`.

---

## 🎯 The Philosophy: Singular vs. Plural

| Repository | Focus | Scope | Question Answered |
| :--- | :--- | :--- | :--- |
| **`ubuntu-services`** *(Plural)* | Fleet / Inventory | All services on the OS | *"What is everything running on my Ubuntu VPS? Are there broken folders?"* |
| **`ubuntu-service`** *(Singular)* | Atomic / Current App | Single service for current directory | *"What service runs THIS folder, and let me restart only this service right now."* |

---

## 💡 The Everyday VPS Problem

When deploying code on an Ubuntu server:
```bash
root@server6358:~/KeshavSoft/appointment-notifier# git pull
Updating cced23f..34bc3e5
Fast-forward
...
```

Now you need to restart the application. But:
* *What is the exact systemd unit name for this directory?*
* Is it `appointment.service`? `appointment-notifier.service`? `appointment.keshavsoft.com.service`?
* Instead of grepping `/etc/systemd/system/` or rebooting the server:

Simply run:
```bash
us restart
```

---

## ⚡ Quick Start

Run directly with zero installation via `npx`:

```bash
# Stand in any project directory on your Ubuntu VPS
cd /root/KeshavSoft/appointment-notifier

# 1. Inspect the service running this directory
npx ubuntu-service
# Or with short alias:
us

# 2. Restart ONLY this service
us restart

# 3. View live systemd logs
us logs -n 50

# 4. Output only the unit name (e.g. for scripts or CI)
us name
```

---

## 📖 CLI Commands

| Command | Description |
| :--- | :--- |
| `us` / `npx ubuntu-service` | Shows service card: unit name, state, PID, memory, port, working directory |
| `us restart` | Restarts only the service attached to the current directory and verifies status |
| `us status` | Detailed status inspection for the current service |
| `us logs [-n <count>]` | Fetches live `journalctl` logs for this specific service |
| `us name` | Prints only the unit name (e.g. `appointment.keshavsoft.com.service`) |
| `us port` | Prints only the detected port (e.g. `3000`) |

### Flags & Options

* `--dir <path>`: Target a specific folder instead of `process.cwd()`
* `--systemd-dir <path>`: Custom systemd directory (useful for testing)
* `-n, --lines <count>`: Number of log lines to retrieve (default: 25)
* `--json`: Output machine-readable JSON
* `-h, --help`: Display help screen

---

## 🏗️ Architecture

```text
ubuntu-service/
├── bin/
│   └── index.js          # Executable entrypoint (`ubuntu-service`, `us`)
├── src/
│   ├── index.js          # Orchestrator (delegates to latest v1)
│   ├── cli.js            # CLI Orchestrator
│   └── v1/
│       ├── index.js      # Public API exports
│       ├── detector.js   # Context detection (CWD to systemd unit mapping)
│       ├── parser.js     # Systemd .service INI & port parser
│       ├── systemctl.js  # Native systemctl & journalctl execution
│       ├── actions.js    # Business actions (inspect, restart, logs)
│       └── cli.js        # Terminal UI & formatting
├── test/                 # Automated test suite (node --test)
├── docs/                 # GitHub Pages portal & live terminal simulator
├── package.json          # Whitelisted files: ["bin", "src"], zero dependencies
└── LICENSE               # ISC License
```

---

## 🛡️ License

ISC License — [KeshavSoft](https://github.com/keshavsoft)
