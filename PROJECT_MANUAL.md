# JBmarks / SDinMotion — Complete Project Manual

> **Last Updated:** July 2026  
> **Developer:** T3S Systems (admin@t3ssystems.co.za)  
> **Client:** JB Marks Local Municipality (Potchefstroom & Ventersdorp)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Deployed Applications](#deployed-applications)
3. [Infrastructure](#infrastructure)
4. [Source Code](#source-code)
5. [API & Webhooks](#api--webhooks)
6. [Azure Subscriptions](#azure-subscriptions)
7. [Deployment Procedures](#deployment-procedures)
8. [SDinMotion Community App](#sdinmotion-community-app)
9. [JBmarks Android App](#jbmarks-android-app)
10. [IT Service Desk](#it-service-desk)
11. [Reports Dashboard](#reports-dashboard)
12. [Network Monitor](#network-monitor)
13. [Bitrix Landing Page (Portal)](#bitrix-landing-page)
14. [Server Access](#server-access)

---

## System Overview

The JBmarks ecosystem consists of multiple applications that integrate with SDiM (Service Delivery in Motion) — a Bitrix24-based municipal management platform. Community members report faults via mobile apps, IT staff manage tickets, and management views reports.

```
Community (SDinMotion App) → Creates tasks in SDiM
                                    ↓
JBmarks App (Android)      → Views/manages all tasks
IT Helpdesk Portal         → Logs IT tickets → SDiM workgroup 14
IT Support Dashboard       → Manages IT tickets
Reports Dashboard          → Analytics & exports
Network Monitor            → Infrastructure health
Bitrix Landing Page        → SDiM portal homepage
```

---

## Deployed Applications

| Application | URL | Platform | Purpose |
|---|---|---|---|
| **IT Support Dashboard** | https://black-water-07331b400.7.azurestaticapps.net | Azure Static Web App | IT team ticket management |
| **IT Helpdesk Portal** | https://zealous-sand-0050fce00.7.azurestaticapps.net | Azure Static Web App | End-user IT ticket logging |
| **Reports Dashboard** | https://polite-tree-08ad84b00.7.azurestaticapps.net | Azure Static Web App | Analytics, exports, reporting |
| **Network Monitor** | https://polite-hill-057872e0f.7.azurestaticapps.net | Azure Static Web App + API | Infrastructure monitoring |
| **SDiM Portal** | https://jbmarks.sdinmotion.co.za | Bitrix24 (VM) | Main municipal platform |
| **Reports Custom Domain** | https://reports.sdinmotion.co.za | CNAME → Azure | Reports (custom domain) |
| **SDinMotion App** | Google Play Store | Android (Capacitor) | Community fault reporting |
| **JBmarks App** | Azure Blob (APK) | Android (native Kotlin) | Task management for staff |

---

## Infrastructure

### Azure Resources

| Resource | Type | Resource Group | Subscription |
|---|---|---|---|
| IT Support Dashboard | Static Web App | RG-JBMARKS-APP | JBMARKS (AOL) |
| IT Helpdesk Portal | Static Web App | RG-JBMARKS-APP | JBMARKS (AOL) |
| Reports Dashboard | Static Web App | RG-JBMARKS-APP | JBMARKS (AOL) |
| Network Monitor | Static Web App + Function | RG-JBMARKS-DEV | JBMARKS (AOL) |
| JBmarks APK Storage | Blob Storage | jbmarksoauthredirecb0ce | Azure subscription 1 (T3S) |
| Prod VM (Bitrix) | Virtual Machine | RG-BITRIX-PROD | Azure subscription 1 (T3S) |
| Dev VM (Bitrix) | Virtual Machine | RG-JBMARKS-DEV | JBMARKS (AOL) |

### Virtual Machines

| VM | IP | Username | Purpose |
|---|---|---|---|
| **Production** | 20.87.213.228 | sdinmotion | Live Bitrix/SDiM portal |
| **Development** | 102.133.224.173 | sdinmotion | Dev/testing environment |

### APK Distribution

| File | URL |
|---|---|
| JBmarks APK | https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/jbmarks.apk |
| version.json | https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/version.json |

---

## Source Code

**DevOps Repository:** https://dev.azure.com/T3Systems/JBMARKS/_git/JBMARKS

### Project Structure

```
JBmarks/
├── app/                          # JBmarks Android app (Kotlin)
├── it-service-desk/
│   ├── helpdesk-portal/          # IT Helpdesk (Vite + React)
│   ├── support-dashboard/        # IT Support Dashboard (Next.js)
│   └── network-monitor/          # Network Monitor (Vite + React + Azure Function)
├── jbmarks-reports/              # Reports Dashboard (Next.js)
├── sdinmotion/
│   └── sdinmotionapp/            # Community App (Vite + React + Capacitor)
├── bitrix-landing-page/          # SDiM Portal Landing Page
│   ├── default/                  # Modified Bitrix24 template with JBmarks theme
│   └── template/                 # Custom standalone template (alternative)
└── bitrix-login-template/        # Custom login screen for Bitrix
```

### Key Branches

| Branch | Purpose |
|---|---|
| master | Production code |
| feature/multi-app-updates | Latest all-app updates |
| feature/cache-user-profile | JBmarks app + login template |
| Loginscreen | Bitrix login + landing page |

---

## API & Webhooks

### SDiM (Bitrix24) Webhook

| Setting | Value |
|---|---|
| **Portal URL** | https://jbmarks.sdinmotion.co.za |
| **Webhook URL** | https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss/ |
| **Webhook User ID** | 1 (Support) |
| **IT Workgroup ID** | 14 |

### Bitrix24 Workgroup IDs

**Potchefstroom:**
| Department | Group ID |
|---|---|
| Water | 6 |
| Electricity | 5 |
| Roads | 7 |
| Waste | 8 |

**Ventersdorp:**
| Department | Group ID |
|---|---|
| Water | 2 |
| Electricity | 1 |
| Roads | 3 |
| Waste | 4 |

---

## Azure Subscriptions

| Subscription | Account | ID | Used For |
|---|---|---|---|
| Azure subscription 1 | admin@t3ssystems.co.za | 41a1a89c-2a50-44b3-b917-d54b517783c2 | Prod VM, APK storage |
| JBMARKS | ITSupport@aol-group.co.za | d5fa3568-4ca5-4aa3-9c48-1873d3b7bf52 | All web apps, Dev VM |

### Switch Subscription

```bash
# T3S subscription
az account set --subscription "41a1a89c-2a50-44b3-b917-d54b517783c2"

# AOL/JBMARKS subscription
az account set --subscription "d5fa3568-4ca5-4aa3-9c48-1873d3b7bf52"
```

---

## Deployment Procedures

### IT Support Dashboard / Helpdesk Portal

```bash
cd it-service-desk/support-dashboard   # or helpdesk-portal
npm run build
# Get token:
az staticwebapp secrets list --name "it-support-dashboard" --resource-group "RG-JBMARKS-APP" --query "properties.apiKey" -o tsv
# Deploy:
npx @azure/static-web-apps-cli deploy out --deployment-token <TOKEN> --env production
```

### Reports Dashboard

```bash
cd jbmarks-reports
npm run build
npx @azure/static-web-apps-cli deploy out --deployment-token <TOKEN> --env production
```

### Network Monitor

```bash
cd it-service-desk/network-monitor
npx vite build
npx @azure/static-web-apps-cli deploy dist --api-location api --api-language node --api-version 18 --deployment-token <TOKEN> --env production
```

### JBmarks Android APK

```bash
# 1. Bump version in app/build.gradle.kts
# 2. Build debug APK
./gradlew :app:assembleDebug
# 3. Upload to Azure Blob
az storage blob upload --account-name jbmarksoauthredirecb0ce --container-name jbmarks-releases --name jbmarks.apk --file app/build/outputs/apk/debug/jbmarks.apk --overwrite true
# 4. Update version.json
```

### SDinMotion App (Play Store)

```bash
cd sdinmotion/sdinmotionapp
npm run mobile:sync                    # Build web + sync to native
cd android
./gradlew bundleRelease                # Signed AAB for Play Store
# Upload .aab to Google Play Console
```

### Bitrix Landing Page (Dev Server)

```bash
cd bitrix-landing-page
# SCP files to server:
scp default/template_styles.css sdinmotion@102.133.224.173:/tmp/
# SSH and install:
ssh sdinmotion@102.133.224.173
sudo cp /tmp/template_styles.css /var/www/bitrix/bitrix/templates/bitrix24/template_styles.css
sudo rm -rf /var/www/bitrix/bitrix/cache/* /var/www/bitrix/bitrix/managed_cache/*
```

---

## SDinMotion Community App

**Purpose:** Community members report municipal faults (Water, Electricity, Roads, Waste)

**Tech:** React + TypeScript + Capacitor 6 (Android/iOS hybrid)  
**Version:** 1.8.0 (Build 20)  
**Play Store:** Published under SDINMOTION account  
**Package:** com.jbmarks.faultreporter

### Features
- Fault reporting with photo capture + GPS location
- Track My Report (live status from SDiM)
- Emergency Contacts (one-tap calling)
- Service Announcements
- Satisfaction Rating (after resolution)
- Offline support + draft saving
- No login required (public use)

### Task Format
When a fault is submitted, the task in SDiM shows:
- **Title:** `Specific Issue - Reporter Name - Location`
- **Description:** Structured fields (Reported By, Contact, Email, Location, Specific Issue, etc.)

---

## JBmarks Android App

**Purpose:** Municipal staff view and manage all tasks from SDiM

**Tech:** Kotlin + Jetpack Compose  
**Version:** 1.0.7 (versionCode 10)  
**Distribution:** Direct APK download from Azure Blob  
**Package:** com.example.jbmarks

### Features
- OAuth login via SDiM
- All tasks with search + sort (newest/oldest)
- Pagination (fetches all pages from API)
- Built-in update checker (reads version.json from Azure)

---

## IT Service Desk

### Helpdesk Portal (User-facing)

**Purpose:** End users log IT support tickets  
**Tech:** Vite + React + Tailwind  
**Login:** SDiM username lookup (no password — uses webhook to find user)

### Support Dashboard (IT Team)

**Purpose:** IT technicians manage tickets  
**Tech:** Next.js + React + Tailwind + Recharts  
**Login:** Restricted to IT workgroup 14 members  

### Features (both apps)
- Ticket creation with category/priority
- Real-time status updates (auto-refresh 30s)
- Comments (cleaned BBCode)
- Assign/reassign technicians
- Email notifications on ticket updates (in-app via SDiM)
- Notification sound (beep) on actions
- Network Monitor link in sidebar

---

## Reports Dashboard

**Purpose:** Management reporting and analytics  
**Tech:** Next.js + React + Tailwind + Recharts  
**Custom Domain:** reports.sdinmotion.co.za

### Reports
1. Task Summary — overview with drill-down
2. Overdue & Deadlines — deadline tracking
3. Time Tracking — time spent analysis
4. Team Workload — per-user distribution

### Features
- Date range filter with presets
- Drill-down panels (click stat card → filtered table)
- Export to Excel + PDF
- Auto-connects via webhook (no login)

---

## Network Monitor

**Purpose:** Real-time infrastructure health monitoring  
**Tech:** Vite + React + Tailwind + Azure Functions (Node.js API)

### Features
- Grid of nodes with color status (green/red/yellow)
- Server-side ping via Azure Function (no CORS issues)
- Auto-refresh every 30 seconds
- Alert sound when node goes down
- Configuration panel (add/edit/delete nodes)
- Test Connection button before saving
- Nodes persist in localStorage

### Pre-configured Nodes
- SDiM Portal (jbmarks.sdinmotion.co.za)
- Dev Server (102.133.224.173)
- Prod Server (20.87.213.228)
- IT Helpdesk, Support Dashboard, Reports

### For Internal Network Monitoring
Deploy locally on a PC inside the network — the browser can then ping internal IPs (192.168.x.x) directly.

---

## Bitrix Landing Page

**Purpose:** Custom themed homepage for the SDiM portal  
**Deployed to:** Dev server (102.133.224.173)

### Theme Changes (applied to template_styles.css)
- Green gradient header (#1B5E20 → #2E7D32 → #4CAF50)
- Sidebar: green top fading to white bottom
- Gold active menu items (#F9A825)
- White menu text
- Custom menu links via `.left.menu_ext.php`

### Menu Extensions Added
- ICT Service Desk → Helpdesk Portal
- IT Support Dashboard → Support Dashboard
- Reports & Analytics → Reports Dashboard

---

## Server Access

### SSH to Dev Server
```bash
ssh sdinmotion@102.133.224.173
# Password required (SSH key configured for some machines)
```

### SSH to Prod Server
```bash
ssh sdinmotion@20.87.213.228
```

### Bitrix Admin Panel
- Dev: http://102.133.224.173/bitrix/admin/
- Prod: https://jbmarks.sdinmotion.co.za/bitrix/admin/

### Azure CLI Login
```bash
az login
# T3S: admin@t3ssystems.co.za
# AOL: ITSupport@aol-group.co.za
```

### DevOps Git
```bash
git remote -v
# origin https://T3Systems@dev.azure.com/T3Systems/JBMARKS/_git/JBMARKS
```

---

## Quick Reference — All Deployment Tokens

Retrieve fresh tokens with:
```bash
az staticwebapp secrets list --name "<app-name>" --resource-group "<rg>" --query "properties.apiKey" -o tsv
```

| App | Name | Resource Group |
|---|---|---|
| IT Support Dashboard | it-support-dashboard | RG-JBMARKS-APP |
| IT Helpdesk | it-helpdesk | RG-JBMARKS-APP |
| Reports | jbmarks-reports | RG-JBMARKS-APP |
| Network Monitor | jbmarks-network-monitor | RG-JBMARKS-DEV |

---

## Contact & Support

- **Developer:** T3S Systems — admin@t3ssystems.co.za / 066 132 7845
- **Azure (T3S):** admin@t3ssystems.co.za
- **Azure (AOL/Client):** ITSupport@aol-group.co.za
- **DevOps:** https://dev.azure.com/T3Systems/JBMARKS
