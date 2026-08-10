import { config } from '../config'
import { ITTicket, SubmitResult } from '../types'

class SdimService {
  private get webhookUrl() {
    return config.sdim.webhookUrl.replace(/\/$/, '')
  }

  async createTicket(ticket: ITTicket, file?: File | null): Promise<SubmitResult> {
    try {
      const deadline = new Date()
      const priorityConfig = config.priorities.find(p => p.id === ticket.priority)
      deadline.setHours(deadline.getHours() + (priorityConfig?.deadline || 24))

      const taskPayload = {
        fields: {
          TITLE: `IT: ${ticket.category} - ${ticket.subject}`,
          DESCRIPTION: this.buildDescription(ticket),
          RESPONSIBLE_ID: config.sdim.defaultResponsibleId, // Webhook user — treated as "Unassigned" on dashboard
          CREATED_BY: config.sdim.defaultResponsibleId,
          GROUP_ID: config.sdim.groupId,
          PRIORITY: priorityConfig?.value || '1',
          DEADLINE: deadline.toISOString(),
          TAGS: ['it-helpdesk', ticket.category.toLowerCase(), 'unassigned'],
        },
      }

      const response = await fetch(`${this.webhookUrl}/tasks.task.add.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`)
      }

      const result = await response.json()

      if (result.error) {
        return { success: false, error: result.error.error_description || result.error }
      }

      const taskId = result.result?.task?.id
      if (!taskId) {
        return { success: false, error: 'No task ID returned' }
      }

      // Attach file if provided
      if (file && file.size > 0) {
        await this.attachFile(String(taskId), file)
      }

      // Send confirmation email to the person who logged the ticket
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

  private async attachFile(taskId: string, file: File): Promise<void> {
    try {
      // Get task's group storage
      const storageResp = await fetch(`${this.webhookUrl}/disk.storage.getlist.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: { ENTITY_TYPE: 'group', ENTITY_ID: config.sdim.groupId } }),
      })

      const storageResult = await storageResp.json()
      if (!storageResult.result?.[0]?.ROOT_OBJECT_ID) return

      const folderId = storageResult.result[0].ROOT_OBJECT_ID

      // Convert to base64
      const base64 = await this.fileToBase64(file)

      // Upload
      const params = new URLSearchParams()
      params.append('id', folderId)
      params.append('data[NAME]', `${Date.now()}_${file.name}`)
      params.append('fileContent', base64)
      params.append('generateUniqueName', '1')

      const uploadResp = await fetch(`${this.webhookUrl}/disk.folder.uploadfile.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })

      const uploadResult = await uploadResp.json()
      if (!uploadResult.result?.ID) return

      // Attach to task
      const attachParams = new URLSearchParams()
      attachParams.append('taskId', taskId)
      attachParams.append('fileId', uploadResult.result.ID)

      await fetch(`${this.webhookUrl}/tasks.task.files.attach.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: attachParams.toString(),
      })
    } catch (e) {
      console.warn('File attach failed (ticket still created):', e)
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1] || '')
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private async sendTicketConfirmationEmail(taskId: string, ticket: ITTicket): Promise<void> {
    try {
      await fetch('https://jbmarksauth-production.up.railway.app/api/email/ticket-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
