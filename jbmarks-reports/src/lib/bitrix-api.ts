/**
 * Bitrix24 REST API Client
 * Handles all API calls to Bitrix24 for report data
 */

export interface BitrixTask {
  id: string
  title: string
  description: string
  status: string // '2'=New, '3'=InProgress, '4'=AwaitingApproval, '5'=Completed, '6'=Deferred
  priority: string // '0'=Low, '1'=Normal, '2'=High
  deadline: string | null
  createdDate: string
  closedDate: string | null
  changedDate: string | null
  createdBy: string
  responsibleId: string
  groupId: string | null
  timeEstimate: string | null
  timeSpentInLogs: string | null
  commentsCount: string
  tags: string[]
  group?: { id: string; name: string }
  creator?: { id: string; name: string }
  responsible?: { id: string; name: string }
}

export interface BitrixUser {
  ID: string
  NAME: string
  LAST_NAME: string
  EMAIL: string
  PERSONAL_PHOTO: string | null
  WORK_POSITION: string | null
}

export interface ElapsedTimeEntry {
  ID: string
  TASK_ID: string
  USER_ID: string
  SECONDS: string
  COMMENT_TEXT: string
  CREATED_DATE: string
}

export interface BitrixWorkgroup {
  GROUP_ID: string
  GROUP_NAME: string
  ROLE: string
}

export type TaskStatus = 'new' | 'in_progress' | 'awaiting_approval' | 'completed' | 'deferred'

export const TASK_STATUS_MAP: Record<string, TaskStatus> = {
  '2': 'new',
  '3': 'in_progress',
  '4': 'awaiting_approval',
  '5': 'completed',
  '6': 'deferred',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  awaiting_approval: 'Awaiting Approval',
  completed: 'Completed',
  deferred: 'Deferred',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  new: '#2E7D32',       // brand medium green
  in_progress: '#F9A825', // brand gold
  awaiting_approval: '#66BB6A', // brand light green
  completed: '#1B5E20',  // brand dark green
  deferred: '#6b7280',
}

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  '0': 'Low',
  '1': 'Normal',
  '2': 'High',
}

class BitrixApiClient {
  private baseUrl: string
  private accessToken: string
  private isWebhook: boolean

  constructor(portalUrl: string, accessToken: string) {
    // Support webhook URLs like https://portal.com/rest/1/token/
    // or standard portal URLs with separate access token
    const cleanUrl = portalUrl.replace(/\/$/, '')
    this.isWebhook = /\/rest\/\d+\/\w+/.test(cleanUrl)
    
    if (this.isWebhook) {
      // Webhook URL already includes auth: https://portal/rest/USER_ID/TOKEN/
      this.baseUrl = cleanUrl
      this.accessToken = ''
    } else {
      this.baseUrl = `${cleanUrl}/rest`
      this.accessToken = accessToken
    }
  }

  private async request<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    const url = `${this.baseUrl}/${method}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (!this.isWebhook && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Bitrix API error: ${response.status} ${response.statusText} — ${text.substring(0, 200)}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`Bitrix API error: ${data.error_description || data.error}`)
    }

    return data
  }

  /**
   * Fetch all tasks with pagination (Bitrix returns 50 per page)
   */
  async getAllTasks(filters: Record<string, string> = {}): Promise<BitrixTask[]> {
    const allTasks: BitrixTask[] = []
    let start = 0
    let hasMore = true

    while (hasMore) {
      const response = await this.request<{ result: { tasks: BitrixTask[] }; total: number; next?: number }>(
        'tasks.task.list',
        {
          filter: filters,
          select: ['*', 'UF_*'],
          start,
        }
      )

      const tasks = response.result?.tasks || []
      allTasks.push(...tasks)

      if (response.next) {
        start = response.next
      } else {
        hasMore = false
      }
    }

    return allTasks
  }

  /**
   * Fetch tasks with specific filters for reports
   */
  async getTasksByStatus(status?: string, groupId?: string): Promise<BitrixTask[]> {
    const filters: Record<string, string> = {}
    if (status) filters['STATUS'] = status
    if (groupId) filters['GROUP_ID'] = groupId
    return this.getAllTasks(filters)
  }

  /**
   * Fetch elapsed time entries for a task
   */
  async getElapsedTime(taskId: string): Promise<ElapsedTimeEntry[]> {
    const response = await this.request<{ result: ElapsedTimeEntry[] }>(
      'task.elapseditem.getlist',
      { TASKID: taskId }
    )
    return response.result || []
  }

  /**
   * Fetch all elapsed time entries across tasks (for time tracking report)
   * We need to iterate through tasks that have time logged
   */
  async getAllElapsedTime(taskIds: string[]): Promise<ElapsedTimeEntry[]> {
    const allEntries: ElapsedTimeEntry[] = []
    
    // Batch requests to avoid rate limiting
    for (const taskId of taskIds) {
      try {
        const entries = await this.getElapsedTime(taskId)
        allEntries.push(...entries)
      } catch (e) {
        // Skip tasks where time tracking fails
        console.warn(`Failed to get elapsed time for task ${taskId}`, e)
      }
    }

    return allEntries
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<BitrixUser> {
    const response = await this.request<{ result: BitrixUser }>('user.current')
    return response.result
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<BitrixUser | null> {
    const response = await this.request<{ result: BitrixUser[] }>('user.get', { ID: userId })
    return response.result?.[0] || null
  }

  /**
   * Get all users (for team reports)
   */
  async getAllUsers(): Promise<BitrixUser[]> {
    const response = await this.request<{ result: BitrixUser[] }>('user.get', { ACTIVE: true })
    return response.result || []
  }

  /**
   * Get user workgroups
   */
  async getWorkgroups(): Promise<BitrixWorkgroup[]> {
    const response = await this.request<{ result: BitrixWorkgroup[] }>('sonet_group.user.groups')
    return response.result || []
  }
}

// Singleton instance - initialized after login
let apiClient: BitrixApiClient | null = null

export function initBitrixApi(portalUrl: string, accessToken: string): BitrixApiClient {
  apiClient = new BitrixApiClient(portalUrl, accessToken)
  return apiClient
}

export function getBitrixApi(): BitrixApiClient {
  if (!apiClient) {
    throw new Error('Bitrix API not initialized. Please log in first.')
  }
  return apiClient
}
