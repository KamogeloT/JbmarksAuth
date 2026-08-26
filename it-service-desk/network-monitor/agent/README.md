# JBmarks Network Monitor — Probe Agent

A tiny Node.js agent that runs **inside your network** so it can monitor
internal/private devices (LAN servers, switches, printers, internal apps) that
Azure cannot reach. It performs real **ICMP ping**, **TCP port**, and **HTTP**
checks locally, then pushes the results up to the backend. The web dashboard
just displays whatever the agent reports.

```
[ Devices on LAN ] <-- ping/tcp/http -- [ Agent (this) ] -- HTTPS --> [ Backend ] <-- [ Dashboard ]
```

## Why an agent?
The dashboard's built-in checker runs on Azure (public internet). It can only
reach public endpoints and only does HTTP. This agent runs where the devices
actually live, so it can:
- Do true **ICMP ping** (host alive) — great for switches, printers, servers
- Check **any TCP port** (e.g. `192.168.1.10:3389`, `10.0.0.5:22`)
- Check **HTTP/HTTPS** web endpoints
- Reach **private IPs** (`192.168.x.x`, `10.x.x.x`)

## How a node is checked
The agent picks the method from the node's `url` field:
| Node URL example | Check performed |
|------------------|-----------------|
| `https://portal.example.com` | HTTP HEAD (falls back to TCP, then ICMP) |
| `192.168.1.10:3389` | TCP connect to port 3389 (falls back to ICMP) |
| `192.168.1.20` | ICMP ping |
| `10.0.0.5:22` | TCP connect to port 22 (SSH) |

Add/edit nodes in the dashboard's Config panel as usual — the agent reads the
same shared list.

## Requirements
- Node.js 16+ on a machine that stays on and sits on the network you want to monitor
  (e.g. the Bitrix VM, an on-prem server, or a Raspberry Pi).
- Outbound HTTPS to the backend (no inbound ports needed).
- On Linux, the `ping` binary (present by default on Ubuntu/Debian).

## Setup

1. Set a shared token on the backend (Railway) so only your agent can post:
   ```bash
   openssl rand -hex 24        # copy the output
   ```
   In Railway → your service → Variables, add:
   ```
   NETWORK_AGENT_TOKEN=<the value you generated>
   ```
   (The backend redeploys automatically.)

2. Copy this `agent/` folder to the machine on your network. Then:
   ```bash
   cp .env.example .env
   # edit .env and set NETWORK_AGENT_TOKEN to the same value
   ```

3. Run it:
   ```bash
   node agent.js
   ```
   You should see lines like:
   ```
   [2026-08-25T15:00:00.000Z] Reported 6 nodes — up:5 slow:0 down:1
   ```

## Run it permanently (Linux / systemd)
Create `/etc/systemd/system/jbmarks-agent.service`:
```ini
[Unit]
Description=JBmarks Network Monitor Agent
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/jbmarks-agent
ExecStart=/usr/bin/node /opt/jbmarks-agent/agent.js
EnvironmentFile=/opt/jbmarks-agent/.env
Restart=always
RestartSec=10
User=nobody

[Install]
WantedBy=multi-user.target
```
Then:
```bash
sudo mkdir -p /opt/jbmarks-agent
sudo cp agent.js .env /opt/jbmarks-agent/
sudo systemctl daemon-reload
sudo systemctl enable --now jbmarks-agent
sudo journalctl -u jbmarks-agent -f     # watch logs
```

## Notes
- No inbound firewall changes needed — the agent only makes **outbound** HTTPS calls.
- Run **one** agent per network segment. Running several is fine; the last write per
  node wins, and the dashboard shows which `agentId` reported it.
- Zero npm dependencies — only Node built-ins. `npm install` is not required.
