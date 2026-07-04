/**
 * SDiM REST API Client for IT Support Dashboard
 * Connects to the same portal as JBmarks app
 */

const WEBHOOK_URL = 'https://jbmarks.sdinmotion.co.za/rest/1/accwtpjw1vnywkss'
const IT_GROUP_ID = '14'
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
  private baseUrl: string

  constructor() {
    this.baseUrl = WEBHOOK_URL
  }

  private async request<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!response.ok) throw new Error(`API error: ${response.status}`)
    const data = await response.json()
    if (data.error) throw new Error(data.error_description || data.error)
    return data
  }

  /** Fetch all IT tickets (tasks in group 14) with pagination */
  async getAllTickets(): Promise<SDiMTask[]> {
    const allTasks: SDiMTask[] = []
    let start = 0
    let hasMore = true

    while (hasMore) {
      const response = await this.request<{ result: { tasks: SDiMTask[] }; next?: number }>(
        'tasks.task.list',
        { filter: { GROUP_ID: IT_GROUP_ID }, select: ['*', 'UF_*'], start }
      )
      const tasks = response.result?.tasks || []
      allTasks.push(...tasks)
      if (response.next) start = response.next
      else hasMore = false
    }

    return allTasks
  }

  /** Get a single ticket */
  async getTicket(taskId: string): Promise<SDiMTask | null> {
    const response = await this.request<{ result: { task: SDiMTask } }>(
      'tasks.task.get',
      { taskId, select: ['*', 'UF_*'] }
    )
    return response.result?.task || null
  }

  /** Update ticket status */
  async startTicket(taskId: string): Promise<void> {
    await this.request('tasks.task.start', { taskId })
  }

  async completeTicket(taskId: string): Promise<void> {
    await this.request('tasks.task.complete', { taskId })
  }

  async deferTicket(taskId: string): Promise<void> {
    await this.request('tasks.task.defer', { taskId })
  }

  async renewTicket(taskId: string): Promise<void> {
    await this.request('tasks.task.renew', { taskId })
  }

  /** Reassign ticket */
  async reassignTicket(taskId: string, newResponsibleId: string): Promise<void> {
    await this.request('tasks.task.update', {
      taskId,
      fields: { RESPONSIBLE_ID: newResponsibleId },
    })
  }

  /** Add comment to ticket */
  async addComment(taskId: string, text: string): Promise<void> {
    await this.request('task.commentitem.add', [taskId, { POST_MESSAGE: text }])
  }

  /** Get comments for a ticket */
  async getComments(taskId: string): Promise<any[]> {
    const response = await this.request<{ result: any[] }>('task.commentitem.getlist', { TASK_ID: taskId })
    return response.result || []
  }

  /** Get current user */
  async getCurrentUser(): Promise<SDiMUser> {
    const response = await this.request<{ result: SDiMUser }>('user.current')
    return response.result
  }

  /** Get all users */
  async getAllUsers(): Promise<SDiMUser[]> {
    const response = await this.request<{ result: SDiMUser[] }>('user.get', { ACTIVE: true })
    return response.result || []
  }

  /** Get IT team members (group 14) */
  async getTeamMembers(): Promise<any[]> {
    const response = await this.request<{ result: any[] }>('sonet_group.user.get', { ID: IT_GROUP_ID })
    return response.result || []
  }

  /** Log time */
  async logTime(taskId: string, seconds: number, comment?: string): Promise<void> {
    await this.request('task.elapseditem.add', {
      TASKID: taskId,
      FIELDS: { SECONDS: seconds, COMMENT_TEXT: comment || '' },
    })
  }
}

export const sdimApi = new SDiMApiClient()
