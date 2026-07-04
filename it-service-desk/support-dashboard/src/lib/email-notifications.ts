/**
 * Email Notification Service for IT Support Dashboard
 * 
 * Uses the SDiM/Bitrix REST API to send notifications when tickets are updated.
 * This leverages:
 * 1. im.notify.system.add — Sends in-app notification to user
 * 2. Bitrix task observers — Auto-notifies when tasks change (built-in)
 * 3. task.commentitem.add — Adding a comment auto-triggers Bitrix email notification to observers
 * 
 * For explicit email, we use the CRM activity email or log a comment that triggers
 * Bitrix's built-in email notification system.
 */

const WEBHOOK_URL = 'https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss'

export type NotificationType = 
  | 'ticket_assigned'
  | 'ticket_status_changed'
  | 'ticket_comment_added'
  | 'ticket_resolved'
  | 'ticket_reopened'

interface NotificationPayload {
  type: NotificationType
  ticketId: string
  ticketTitle: string
  recipientUserId: string
  recipientEmail?: string
  technicianName?: string
  previousStatus?: string
  newStatus?: string
  comment?: string
  callerName?: string
  callerEmail?: string
}

/** Build a formatted notification message */
function buildMessage(payload: NotificationPayload): string {
  const { type, ticketId, ticketTitle, technicianName, newStatus, comment, callerName } = payload

  switch (type) {
    case 'ticket_assigned':
      return `🔧 Ticket #${ticketId} has been assigned to ${technicianName}.\n\nTicket: ${ticketTitle}\n\nPlease review and action.`
    
    case 'ticket_status_changed':
      return `📋 Ticket #${ticketId} status updated to: ${newStatus}\n\nTicket: ${ticketTitle}`
    
    case 'ticket_comment_added':
      return `💬 New comment on Ticket #${ticketId}\n\nTicket: ${ticketTitle}\n\nComment: ${comment}`
    
    case 'ticket_resolved':
      return `✅ Ticket #${ticketId} has been resolved.\n\nTicket: ${ticketTitle}\n\nIf you still experience issues, please reopen the ticket or log a new one.`
    
    case 'ticket_reopened':
      return `🔄 Ticket #${ticketId} has been reopened.\n\nTicket: ${ticketTitle}`
    
    default:
      return `📨 Update on Ticket #${ticketId}: ${ticketTitle}`
  }
}

/** Build an email-friendly HTML message */
function buildEmailHtml(payload: NotificationPayload): string {
  const { type, ticketId, ticketTitle, technicianName, newStatus, comment } = payload

  let heading = ''
  let body = ''

  switch (type) {
    case 'ticket_assigned':
      heading = '🔧 Ticket Assigned'
      body = `<p>Ticket <strong>#${ticketId}</strong> has been assigned to <strong>${technicianName}</strong>.</p><p><strong>Subject:</strong> ${ticketTitle}</p><p>Please review and action this ticket.</p>`
      break
    case 'ticket_status_changed':
      heading = '📋 Status Updated'
      body = `<p>Ticket <strong>#${ticketId}</strong> status has been updated to: <strong>${newStatus}</strong></p><p><strong>Subject:</strong> ${ticketTitle}</p>`
      break
    case 'ticket_comment_added':
      heading = '💬 New Comment'
      body = `<p>A new comment was added to Ticket <strong>#${ticketId}</strong>.</p><p><strong>Subject:</strong> ${ticketTitle}</p><p><strong>Comment:</strong> ${comment}</p>`
      break
    case 'ticket_resolved':
      heading = '✅ Ticket Resolved'
      body = `<p>Ticket <strong>#${ticketId}</strong> has been resolved.</p><p><strong>Subject:</strong> ${ticketTitle}</p><p>If you still experience issues, please reopen the ticket or log a new one.</p>`
      break
    case 'ticket_reopened':
      heading = '🔄 Ticket Reopened'
      body = `<p>Ticket <strong>#${ticketId}</strong> has been reopened for further investigation.</p><p><strong>Subject:</strong> ${ticketTitle}</p>`
      break
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1B5E20, #2E7D32); padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">${heading}</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 13px;">JB Marks ICT Service Desk</p>
      </div>
      <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        ${body}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280;">This is an automated notification from the JB Marks ICT Service Desk. Do not reply to this email.</p>
      </div>
    </div>
  `
}

class EmailNotificationService {
  
  /** Send in-app notification to a user via SDiM */
  async sendInAppNotification(userId: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`${WEBHOOK_URL}/im.notify.system.add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          USER_ID: userId,
          MESSAGE: message,
        }),
      })
      const data = await response.json()
      return !data.error
    } catch (e) {
      console.error('Failed to send in-app notification:', e)
      return false
    }
  }

  /** Send email notification via SDiM event (triggers Bitrix built-in mailer) */
  async sendEmailViaEvent(userId: string, subject: string, htmlBody: string): Promise<boolean> {
    try {
      // Use Bitrix event system to send email
      const response = await fetch(`${WEBHOOK_URL}/event.send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          EVENT: 'CUSTOM_IT_NOTIFICATION',
          FIELDS: {
            USER_ID: userId,
            SUBJECT: subject,
            BODY: htmlBody,
          },
        }),
      })
      return response.ok
    } catch (e) {
      console.error('Failed to send email event:', e)
      return false
    }
  }

  /** 
   * Notify when a ticket is assigned to a technician.
   * Notifies both the technician and the person who logged the ticket.
   */
  async notifyTicketAssigned(
    ticketId: string,
    ticketTitle: string,
    technicianUserId: string,
    technicianName: string,
    callerUserId?: string,
    callerName?: string,
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: 'ticket_assigned',
      ticketId,
      ticketTitle,
      recipientUserId: technicianUserId,
      technicianName,
    }

    const message = buildMessage(payload)

    // Notify technician
    await this.sendInAppNotification(technicianUserId, message)

    // Notify caller/reporter if different person
    if (callerUserId && callerUserId !== technicianUserId) {
      const callerPayload = { ...payload, recipientUserId: callerUserId }
      const callerMessage = `🔧 Your ticket #${ticketId} has been assigned to ${technicianName}.\n\n"${ticketTitle}"`
      await this.sendInAppNotification(callerUserId, callerMessage)
    }
  }

  /**
   * Notify when ticket status changes
   */
  async notifyStatusChanged(
    ticketId: string,
    ticketTitle: string,
    newStatus: string,
    responsibleUserId: string,
    callerUserId?: string,
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: newStatus === 'Resolved' ? 'ticket_resolved' : newStatus === 'New' ? 'ticket_reopened' : 'ticket_status_changed',
      ticketId,
      ticketTitle,
      recipientUserId: responsibleUserId,
      newStatus,
    }

    const message = buildMessage(payload)

    // Notify responsible
    if (responsibleUserId && responsibleUserId !== '1') {
      await this.sendInAppNotification(responsibleUserId, message)
    }

    // Notify caller
    if (callerUserId && callerUserId !== responsibleUserId) {
      await this.sendInAppNotification(callerUserId, message)
    }
  }

  /**
   * Notify when a comment is added
   */
  async notifyCommentAdded(
    ticketId: string,
    ticketTitle: string,
    comment: string,
    authorUserId: string,
    responsibleUserId: string,
    callerUserId?: string,
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: 'ticket_comment_added',
      ticketId,
      ticketTitle,
      recipientUserId: responsibleUserId,
      comment: comment.length > 100 ? comment.substring(0, 100) + '...' : comment,
    }

    const message = buildMessage(payload)

    // Notify responsible if they're not the author
    if (responsibleUserId !== authorUserId && responsibleUserId !== '1') {
      await this.sendInAppNotification(responsibleUserId, message)
    }

    // Notify caller if they're not the author
    if (callerUserId && callerUserId !== authorUserId && callerUserId !== responsibleUserId) {
      await this.sendInAppNotification(callerUserId, message)
    }
  }
}

export const emailNotifications = new EmailNotificationService()
