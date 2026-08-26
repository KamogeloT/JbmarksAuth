/**
 * Service Desk API client.
 * All calls go through the authenticated backend proxy (/api/tickets, /api/team).
 * The Bitrix webhook token is server-side only and never exposed to the browser.
 */

import { apiFetch } from './api'

const WEBHOOK_USER_ID = '1' // Tickets assigned to this user are considered "Unassigned"

export interface SDiMTask {
  id: string
  title: string
  description: string
  status: string
  priority: string
  deadline: string | null
  createdDate: string | null
  closedDate: string | null
  createdBy: string
  responsibleId: string
  groupId: string | null
  timeSpentInLogs: string | null
  commentsCount: string
  tags: string[]
  group?: { id: string; name: string }
  creator?: { id: string; name: string }
  responsible?: { id: string; name: string }
}

export interface SDiMUser {
  ID: string
  NAME: string
  LAST_NAME: string
  EMAIL: string
  PERSONAL_PHOTO: string | null
  WORK_POSITION: string | null
}

export const TICKET_STATUS_MAP: Record<string, string> = {
  '2': 'New',
  '3': 'In Progress',
  '4': 'Awaiting User',
  '5': 'Resolved',
  '6': 'Deferred',
}

export const TICKET_STATUS_COLORS: Record<string, string> = {
  '2': '#3b82f6',
  '3': '#F9A825',
  '4': '#8b5cf6',
  '5': '#1B5E20',
  '6': '#6b7280',
}

export const PRIORITY_MAP: Record<string, string> = {
  '0': 'Low',
  '1': 'Normal',
  '2': 'High',
}

/** Returns true if the ticket is effectively unassigned (still on webhook user) */
export function isUnassigned(task: SDiMTask): boolean {
  return !task.responsibleId || task.responsibleId === WEBHOOK_USER_ID
}

/** Display name for the responsible person — shows "Unassigned" for webhook user */
export function getAssigneeName(task: SDiMTask): string {
  if (isUnassigned(task)) return 'Unassigned'
  return task.responsible?.name || `User ${task.responsibleId}`
}

/** Parse the caller/reporter info from the task description */
export interface CallerInfo {
  name: string
  email: string
  department: string
  phone: string
}

export function parseCallerInfo(description: string | undefined): CallerInfo {
  if (!description) return { name: '', email: '', department: '', phone: '' }

  const getField = (label: string): string => {
    const pattern = new RegExp(`^${label}:\\s*(.+)`, 'im')
    for (const line of description.split('\n')) {
      const match = pattern.exec(line.trim())
      if (match && match[1]?.trim() && match[1].trim() !== 'Not provided') return match[1].trim()
    }
    return ''
  }

  return {
    name: getField('Reported By') || getField('Full Name') || '',
    email: getField('Email') || '',
    department: getField('Department') || '',
    phone: getField('Contact') || getField('Phone') || '',
  }
}

class SDiMApiClient {
  private async json<T>(res: Response): Promise<T> {
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as any).message || (data as any).error || `API error ${res.status}`)
    return data as T
  }

  /** Fetch all IT tickets (server enforces role-based scope). */
  async getAllTickets(): Promise<SDiMTask[]> {
    const res = await apiFetch('/api/tickets')
    const data = await this.json<{ tickets: SDiMTask[] }>(res)
    return data.tickets || []
  }

  /** Get a single ticket */
  async getTicket(taskId: string): Promise<SDiMTask | null> {
    const res = await apiFetch(`/api/tickets/${taskId}`)
    const data = await this.json<{ ticket: SDiMTask }>(res)
    return data.ticket || null
  }

  private async action(taskId: string, action: string): Promise<void> {
    await this.json(await apiFetch(`/api/tickets/${taskId}/action`, {
      method: 'POST', body: JSON.stringify({ action }),
    }))
  }

  async startTicket(taskId: string): Promise<void> { await this.action(taskId, 'start') }
  async completeTicket(taskId: string): Promise<void> { await this.action(taskId, 'complete') }
  async deferTicket(taskId: string): Promise<void> { await this.action(taskId, 'defer') }
  async renewTicket(taskId: string): Promise<void> { await this.action(taskId, 'reopen') }

  /** Reassign ticket (Agent/Admin only — enforced server-side) */
  async reassignTicket(taskId: string, newResponsibleId: string): Promise<void> {
    await this.json(await apiFetch(`/api/tickets/${taskId}/assign`, {
      method: 'POST', body: JSON.stringify({ userId: newResponsibleId }),
    }))
  }

  /** Add comment to ticket */
  async addComment(taskId: string, text: string): Promise<void> {
    await this.json(await apiFetch(`/api/tickets/${taskId}/comment`, {
      method: 'POST', body: JSON.stringify({ text }),
    }))
  }

  /** Comments are returned inline by the ticket detail proxy; kept for compatibility. */
  async getComments(taskId: string): Promise<any[]> {
    try {
      const res = await apiFetch(`/api/tickets/${taskId}`)
      const data = await this.json<{ ticket: any }>(res)
      return data.ticket?.comments || []
    } catch { return [] }
  }

  /** Get IT team members (group 14) */
  async getTeamMembers(): Promise<any[]> {
    const res = await apiFetch('/api/team')
    const data = await this.json<{ members: any[] }>(res)
    return data.members || []
  }
}

export const sdimApi = new SDiMApiClient()
