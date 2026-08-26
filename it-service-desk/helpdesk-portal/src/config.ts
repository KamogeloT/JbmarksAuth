export const config = {
  // NOTE: The Bitrix webhook token is NO LONGER used in the browser. All SDiM
  // access goes through the authenticated backend (see services/api.ts).
  sdim: {
    groupId: '14', // IT Support workgroup (reference only)
    defaultResponsibleId: '1', // Unassigned-queue user (reference only)
  },
  app: {
    name: 'IT Helpdesk',
    version: '1.0.0',
    supportEmail: 'admin@t3ssystems.co.za',
    supportPhone: '0661327845',
  },
  categories: [
    { id: 'hardware', label: 'Hardware', icon: '💻', issues: ['Laptop/PC not working', 'Printer issue', 'Monitor problem', 'Keyboard/Mouse', 'Docking station', 'Other hardware'] },
    { id: 'software', label: 'Software', icon: '🖥️', issues: ['Application not opening', 'Software installation', 'Software update needed', 'License issue', 'Application error/crash', 'Other software'] },
    { id: 'network', label: 'Network', icon: '🌐', issues: ['No internet', 'Slow connection', 'WiFi not working', 'VPN issue', 'Network drive inaccessible', 'Other network'] },
    { id: 'access', label: 'Access & Permissions', icon: '🔐', issues: ['Password reset', 'Account locked', 'New account request', 'Permission change', 'Email access', 'Other access'] },
    { id: 'email', label: 'Email', icon: '📧', issues: ['Cannot send/receive', 'Outlook not working', 'Calendar issue', 'Email storage full', 'Shared mailbox', 'Other email'] },
    { id: 'other', label: 'Other', icon: '🔧', issues: ['General enquiry', 'New equipment request', 'Training request', 'Other'] },
  ],
  priorities: [
    { id: 'low', label: 'Low', value: '0', description: 'Minimal impact, can wait', color: '#6b7280', deadline: 48 },
    { id: 'normal', label: 'Normal', value: '1', description: 'Standard request', color: '#2E7D32', deadline: 24 },
    { id: 'high', label: 'High', value: '2', description: 'Affecting work significantly', color: '#F9A825', deadline: 8 },
    { id: 'critical', label: 'Critical', value: '2', description: 'Work completely stopped', color: '#DC2626', deadline: 4 },
  ],
  departments: [
    'Finance', 'HR', 'Operations', 'Management', 'IT', 'Legal', 'Procurement', 'Communications', 'Other'
  ],
}
