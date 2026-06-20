import { useState, FormEvent, ChangeEvent } from 'react'
import { config } from '../config'
import { ITTicket } from '../types'
import { sdimService } from '../services/sdimService'
import { storageService } from '../services/storageService'
import { AuthUser } from '../hooks/useAuth'

interface TicketFormProps {
  onBack: () => void
  onSuccess: () => void
  user: AuthUser | null
}

export function TicketForm({ onBack, onSuccess, user }: TicketFormProps) {
  const [logForOther, setLogForOther] = useState(false)
  const [form, setForm] = useState({
    fullName: user ? `${user.name} ${user.lastName}` : '',
    email: user?.email || '',
    department: user?.department || '',
    phone: user?.phone || '',
    category: '', subject: '', priority: 'normal' as const,
    description: '', assetTag: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [successRef, setSuccessRef] = useState('')

  const selectedCat = config.categories.find(c => c.id === form.category)

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    if (f) {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    const id = storageService.generateId()
    const refNumber = storageService.generateRefNumber()

    const ticket: ITTicket = {
      id, refNumber,
      fullName: form.fullName,
      email: form.email,
      department: form.department,
      phone: form.phone || undefined,
      category: selectedCat?.label || form.category,
      subject: form.subject,
      priority: form.priority,
      description: form.description,
      assetTag: form.assetTag || undefined,
      screenshot: file,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    storageService.saveTicket(ticket)
    const result = await sdimService.createTicket(ticket, file)

    if (result.success) {
      ticket.taskId = result.taskId
      ticket.status = 'submitted'
      ticket.submittedAt = new Date().toISOString()
      storageService.saveTicket(ticket)
      setSuccessRef(refNumber)
      setStatus('success')
    } else {
      ticket.status = 'failed'
      ticket.error = result.error
      storageService.saveTicket(ticket)
      setErrorMsg(result.error || 'Failed to submit')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Submitted</h2>
            <p className="text-gray-500 mb-6">Our IT team has been notified and will respond within the SLA timeframe.</p>
            <div className="bg-primary-50 rounded-xl p-4 mb-8">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Reference Number</p>
              <p className="text-2xl font-bold text-brand-dark mt-1">{successRef}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onBack} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-200 transition-colors">New Ticket</button>
              <button onClick={onSuccess} className="flex-1 bg-brand-dark text-white rounded-xl py-3 font-semibold hover:bg-brand-medium transition-colors">My Tickets</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 lg:px-10 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="JBmarks" className="h-8 w-auto" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Log IT Ticket</h1>
            <p className="text-xs text-gray-500">Fill in the details below</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-6 lg:px-10 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl">
          {/* Left column: Personal info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-brand-dark text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  {logForOther ? 'Caller Details' : 'Your Details'}
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">Log for someone else</span>
                  <input
                    type="checkbox"
                    checked={logForOther}
                    onChange={e => {
                      setLogForOther(e.target.checked)
                      if (!e.target.checked && user) {
                        setForm(prev => ({
                          ...prev,
                          fullName: `${user.name} ${user.lastName}`,
                          email: user.email || '',
                          department: user.department || '',
                          phone: user.phone || '',
                        }))
                      } else {
                        setForm(prev => ({ ...prev, fullName: '', email: '', department: '', phone: '' }))
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-brand-dark focus:ring-brand-medium"
                  />
                </label>
              </div>

              {!logForOther && user ? (
                <div className="bg-primary-50 rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center text-sm font-bold">
                      {user.name?.[0]}{user.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{user.name} {user.lastName}</p>
                      <p className="text-xs text-gray-600">{user.email}</p>
                      {user.department && <p className="text-xs text-gray-500">{user.department}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input name="fullName" required value={form.fullName} onChange={handleChange} placeholder="John Doe" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="john@company.co.za" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
                    <select name="department" required value={form.department} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium outline-none transition appearance-none bg-white">
                      <option value="">Select department</option>
                      {config.departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone / Extension</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="ext. 2401" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium outline-none transition" />
                  </div>
                </div>
              )}
            </div>

            {/* Screenshot */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold">📎</span>
                Attachment (Optional)
              </h3>
              {!preview ? (
                <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-medium hover:bg-primary-50/30 transition-all">
                  <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm text-gray-500 font-medium">Click to upload a screenshot</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
              ) : (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full h-44 object-cover rounded-xl" />
                  <button type="button" onClick={() => { setFile(null); setPreview(null) }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Issue details */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-brand-dark text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                Issue Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <select name="category" required value={form.category} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium outline-none transition appearance-none bg-white">
                    <option value="">Select category</option>
                    {config.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>

                {selectedCat && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specific Issue <span className="text-red-500">*</span></label>
                    <select name="subject" required value={form.subject} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium outline-none transition appearance-none bg-white">
                      <option value="">Select issue type</option>
                      {selectedCat.issues.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {config.priorities.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, priority: p.id as any }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          form.priority === p.id
                            ? 'border-brand-dark bg-primary-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></div>
                          <span className="font-semibold text-sm text-gray-900">{p.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 ml-[18px]">{p.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea name="description" required rows={5} value={form.description} onChange={handleChange} placeholder="Describe what's happening, what you expected, and any error messages..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium outline-none transition resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag / PC Name</label>
                  <input name="assetTag" value={form.assetTag} onChange={handleChange} placeholder="e.g., PC-FIN-042 or LAPTOP-HR-007" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-medium/30 focus:border-brand-medium outline-none transition" />
                </div>
              </div>
            </div>

            {/* Error */}
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                <p className="font-semibold mb-1">Submission Failed</p>
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-brand-dark text-white py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50 hover:bg-brand-medium transition-all duration-200"
            >
              {status === 'submitting' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Submitting...
                </span>
              ) : 'Submit Ticket'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
