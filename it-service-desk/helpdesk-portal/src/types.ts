export interface ITTicket {
  id: string
  refNumber: string
  fullName: string
  email: string
  department: string
  phone?: string
  category: string
  subject: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  description: string
  assetTag?: string
  screenshot?: File | null
  status: 'draft' | 'pending' | 'submitted' | 'failed'
  taskId?: string
  createdAt: string
  submittedAt?: string
  error?: string
}

export interface SubmitResult {
  success: boolean
  taskId?: string
  error?: string
}
