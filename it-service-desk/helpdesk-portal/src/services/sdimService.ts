import { config } from '../config'
import { ITTicket, SubmitResult } from '../types'
import { apiFetch } from './api'

class SdimService {
  async createTicket(ticket: ITTicket, _file?: File | null): Promise<SubmitResult> {
    try {
      const priorityConfig = config.priorities.find(p => p.id === ticket.priority)

      // Route through the authenticated backend. Ownership (CREATED_BY) is
      // stamped server-side from the session — the browser never holds the
      // Bitrix token, and requesters can only see tickets they created.
      const response = await apiFetch('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: `IT: ${ticket.category} - ${ticket.subject}`,
          description: this.buildDescription(ticket),
          priority: priorityConfig?.value || '1',
          deadlineHours: priorityConfig?.deadline || 24,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (response.status === 401) return { success: false, error: 'Please sign in to log a ticket.' }
      if (!response.ok || !result.success) {
        return { success: false, error: result.message || result.error || 'Failed to submit ticket' }
      }

      const taskId = result.ticketId
      if (!taskId) return { success: false, error: 'No ticket ID returned' }

      // Confirmation email to the reporter (via authenticated backend)
      if (ticket.email) {
        this.sendTicketConfirmationEmail(String(taskId), ticket).catch(e =>
          console.warn('Email notification failed (ticket still created):', e)
        )
      }

      return { success: true, taskId: String(taskId) }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit ticket',
      }
    }
  }

  private async sendTicketConfirmationEmail(taskId: string, ticket: ITTicket): Promise<void> {
    try {
      await apiFetch('/api/email/ticket-notification', {
        method: 'POST',
        body: JSON.stringify({
          type: 'created',
          ticketId: taskId,
          ticketTitle: `${ticket.category} - ${ticket.subject}`,
          recipientEmail: ticket.email,
          recipientName: ticket.fullName,
          callerName: ticket.fullName,
          category: ticket.category,
          priority: ticket.priority,
          department: ticket.department,
        }),
      })
    } catch (e) {
      console.warn('Email confirmation failed:', e)
    }
  }

  private buildDescription(ticket: ITTicket): string {
    return `
IT SUPPORT TICKET
==================

Reference: ${ticket.refNumber}
Reported By: ${ticket.fullName}
Email: ${ticket.email}
Department: ${ticket.department}
Phone: ${ticket.phone || 'Not provided'}
Asset Tag: ${ticket.assetTag || 'Not provided'}

Category: ${ticket.category}
Subject: ${ticket.subject}
Priority: ${ticket.priority.toUpperCase()}

Description:
${ticket.description}

---
Submitted via IT Helpdesk Portal
Timestamp: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
    `.trim()
  }
}

export const sdimService = new SdimService()
