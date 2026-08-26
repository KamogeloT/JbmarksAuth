/**
 * Email Notification Service for IT Support Dashboard
 * 
 * Sends real email notifications via the Railway backend (Azure Communication Services)
 * AND in-app notifications via Bitrix im.notify.system.add.
 * 
 * Emails are sent for:
 * - Ticket created → IT team + caller confirmation
 * - Ticket assigned → technician + caller
 * - Status changed → caller + technician
 * - Comment added → other party (caller or technician)
 * - Ticket resolved → caller
 * - Ticket reopened → technician
 */

import { apiFetch } from './api'

const EMAIL_API_PATH = '/api/email/ticket-notification'

export type NotificationType = 
  | 'created'
  | 'assigned'
  | 'status_changed'
  | 'comment_added'
  | 'resolved'
  | 'reopened'

interface NotificationPayload {
  type: NotificationType
  ticketId: string
  ticketTitle: string
  recipientEmail: string
  recipientName?: string
  technicianName?: string
  technicianUserId?: string
  callerName?: string
  callerEmail?: string
  status?: string
  comment?: string
  priority?: string
  category?: string
  department?: string
}

class EmailNotificationService {

  /** Send email notification via the authenticated backend */
  private async sendEmail(payload: NotificationPayload): Promise<boolean> {
    try {
      const response = await apiFetch(EMAIL_API_PATH, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.success) {
        console.log(`✅ Email sent: ${payload.type} to ${payload.recipientEmail}`)
        return true
      }
      console.warn(`⚠️ Email API error: ${data.message || data.error}`)
      return false
    } catch (e) {
      console.error('Failed to send email notification:', e)
      return false
    }
  }

  /** In-app notifications now handled server-side via the ticket proxy audit comments. */
  private async sendInAppNotification(_userId: string, _message: string): Promise<boolean> {
    return true
  }

  /**
   * Ticket created — notify IT team + send confirmation to caller
   */
  async notifyTicketCreated(
    ticketId: string,
    ticketTitle: string,
    callerName: string,
    callerEmail: string,
    category: string,
    priority: string,
    department: string,
  ): Promise<void> {
    // Email to caller (confirmation)
    if (callerEmail) {
      await this.sendEmail({
        type: 'created',
        ticketId,
        ticketTitle,
        recipientEmail: callerEmail,
        recipientName: callerName,
        callerName,
        category,
        priority,
        department,
      })
    }

    // In-app notification to IT team (user 1 = admin)
    await this.sendInAppNotification('1', 
      `🎫 New IT Ticket #${ticketId}: ${ticketTitle}\nFrom: ${callerName} (${department})\nPriority: ${priority}`)
  }

  /**
   * Ticket assigned — notify technician + inform caller
   */
  async notifyTicketAssigned(
    ticketId: string,
    ticketTitle: string,
    technicianUserId: string,
    technicianName: string,
    technicianEmail: string,
    callerName?: string,
    callerEmail?: string,
  ): Promise<void> {
    // Email to technician
    if (technicianEmail) {
      await this.sendEmail({
        type: 'assigned',
        ticketId,
        ticketTitle,
        recipientEmail: technicianEmail,
        recipientName: technicianName,
        technicianName,
        callerName,
      })
    }

    // Email to caller
    if (callerEmail) {
      await this.sendEmail({
        type: 'assigned',
        ticketId,
        ticketTitle,
        recipientEmail: callerEmail,
        recipientName: callerName,
        technicianName,
      })
    }

    // In-app to technician
    await this.sendInAppNotification(technicianUserId,
      `🔧 Ticket #${ticketId} assigned to you: ${ticketTitle}`)
  }

  /**
   * Status changed — notify both parties
   */
  async notifyStatusChanged(
    ticketId: string,
    ticketTitle: string,
    newStatus: string,
    technicianUserId: string,
    technicianEmail?: string,
    callerName?: string,
    callerEmail?: string,
  ): Promise<void> {
    const type: NotificationType = newStatus === 'Resolved' ? 'resolved' 
      : newStatus === 'New' ? 'reopened' 
      : 'status_changed'

    // Email to caller
    if (callerEmail) {
      await this.sendEmail({
        type,
        ticketId,
        ticketTitle,
        recipientEmail: callerEmail,
        recipientName: callerName,
        status: newStatus,
      })
    }

    // Email to technician (if reopened or status changed by caller)
    if (technicianEmail && type === 'reopened') {
      await this.sendEmail({
        type,
        ticketId,
        ticketTitle,
        recipientEmail: technicianEmail,
        status: newStatus,
      })
    }

    // In-app notification
    if (technicianUserId && technicianUserId !== '1') {
      await this.sendInAppNotification(technicianUserId,
        `📋 Ticket #${ticketId} status → ${newStatus}: ${ticketTitle}`)
    }
  }

  /**
   * Comment added — notify the other party
   */
  async notifyCommentAdded(
    ticketId: string,
    ticketTitle: string,
    comment: string,
    authorUserId: string,
    technicianUserId: string,
    technicianEmail?: string,
    callerName?: string,
    callerEmail?: string,
  ): Promise<void> {
    const shortComment = comment.length > 200 ? comment.substring(0, 200) + '...' : comment

    // If author is technician → email the caller
    if (authorUserId === technicianUserId && callerEmail) {
      await this.sendEmail({
        type: 'comment_added',
        ticketId,
        ticketTitle,
        recipientEmail: callerEmail,
        recipientName: callerName,
        comment: shortComment,
      })
    }

    // If author is caller → email the technician
    if (authorUserId !== technicianUserId && technicianEmail) {
      await this.sendEmail({
        type: 'comment_added',
        ticketId,
        ticketTitle,
        recipientEmail: technicianEmail,
        comment: shortComment,
        callerName,
        callerEmail,
      })
    }

    // In-app to the other party
    if (authorUserId !== technicianUserId && technicianUserId !== '1') {
      await this.sendInAppNotification(technicianUserId,
        `💬 New comment on Ticket #${ticketId}: ${shortComment.substring(0, 80)}`)
    }
  }
}

export const emailNotifications = new EmailNotificationService()
