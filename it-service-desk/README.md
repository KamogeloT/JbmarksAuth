# IT Service Desk

Two web apps for internal IT support:

## Apps

### 1. Helpdesk Portal (`helpdesk-portal/`)
End users log IT tickets. No login required.
- Tech: React + Vite + Tailwind CSS
- Categories: Hardware, Software, Network, Access, Email, Other
- Creates tasks in SDiM workgroup 14 (IT Support)
- Webhook: same as JBmarks app

### 2. Support Dashboard (`support-dashboard/`)
IT team manages tickets with OAuth authentication.
- Tech: Next.js + React + Tailwind CSS + Recharts
- OAuth login via SDiM (same flow as JBmarks Android app)
- Ticket queue, assignments, status changes, comments, reports

## SDiM Configuration
- Portal: https://jbmarks.sdinmotion.co.za
- IT Support Workgroup: Group ID 14
- Webhook: /rest/1/accwtpjw1vnywkss

## Running Locally

```bash
# Helpdesk Portal (end users)
cd helpdesk-portal
npm install
npm run dev    # http://localhost:3001

# Support Dashboard (IT team)
cd support-dashboard
npm install
npm run dev    # http://localhost:3002
```
