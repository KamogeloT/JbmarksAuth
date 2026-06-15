# JBmarks Reports Dashboard

Standalone web-based reporting dashboard for JBmarks, powered by Bitrix24 REST API.

## Features

- **Task Summary** — Status breakdown, priority distribution, tasks by workgroup
- **Overdue & Deadlines** — Overdue tasks with severity, upcoming deadlines, per-person breakdown
- **Time Tracking** — Hours logged per task, estimated vs actual, time by group
- **Team Workload** — Task distribution per team member, completion rates, workload balance
- **CSV Export** — Download any report as a spreadsheet

## Tech Stack

- **Next.js 14** (React, TypeScript)
- **Tailwind CSS** (styling)
- **Recharts** (charts and visualizations)
- **Bitrix24 REST API** (data source)

## Getting Started

### Prerequisites

- Node.js 18+
- A Bitrix24 portal with API access (webhook token or OAuth)

### Setup

```bash
# Navigate to the project
cd jbmarks-reports

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your Bitrix24 credentials
# (or just use the login form — no env vars strictly required for client-side auth)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Authentication

On the login screen, enter:
- **Portal URL**: Your Bitrix24 portal (e.g., `https://jbmarks.sdinmotion.co.za`)
- **Access Token**: A webhook token or OAuth access token

To get a webhook token:
1. Go to your Bitrix24 portal → Developer resources → Other → Inbound webhook
2. Create a webhook with these permissions: `task`, `user`, `sonet_group`, `calendar`
3. Copy the token from the webhook URL

## Deployment

### Azure Static Web Apps (recommended)

```bash
npm run build
# Deploy the .next/standalone output to Azure
```

### Railway

```bash
# Push to Git, Railway auto-deploys from package.json
```

### Any Node.js host

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                  # Next.js app router
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main page (report shell)
│   └── globals.css       # Tailwind imports
├── components/
│   ├── auth/             # Login page
│   ├── filters/          # Report filter controls
│   ├── layout/           # Sidebar, header
│   ├── reports/          # Report components (one per report type)
│   └── ui/               # Shared UI (stat cards, export button)
├── hooks/
│   └── useAuth.ts        # Authentication hook
└── lib/
    └── bitrix-api.ts     # Bitrix24 API client
```

## Related

- [JBmarks Android App](https://dev.azure.com/T3Systems/JBMARKS/_git/JBMARKS) — Mobile companion app
- [Bitrix24 REST API Docs](https://training.bitrix24.com/rest_help/)
