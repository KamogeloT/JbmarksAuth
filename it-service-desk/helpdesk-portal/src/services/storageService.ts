import { ITTicket } from '../types'

const TICKETS_KEY = 'it_helpdesk_tickets'
const DRAFT_KEY = 'it_helpdesk_draft'

class StorageService {
  saveTicket(ticket: ITTicket): void {
    const tickets = this.getAllTickets()
    const idx = tickets.findIndex(t => t.id === ticket.id)
    if (idx >= 0) tickets[idx] = ticket
    else tickets.push(ticket)
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets))
  }

  getAllTickets(): ITTicket[] {
    try {
      const data = localStorage.getItem(TICKETS_KEY)
      if (!data) return []
      return (JSON.parse(data) as ITTicket[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    } catch {
      return []
    }
  }

  deleteTicket(id: string): void {
    const tickets = this.getAllTickets().filter(t => t.id !== id)
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets))
  }

  saveDraft(draft: Partial<ITTicket>): void {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  getDraft(): Partial<ITTicket> | null {
    try {
      const data = localStorage.getItem(DRAFT_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  clearDraft(): void {
    localStorage.removeItem(DRAFT_KEY)
  }

  generateId(): string {
    return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateRefNumber(): string {
    return `IT-${Date.now().toString().slice(-8)}`
  }
}

export const storageService = new StorageService()
