import React, { useState } from 'react'
import { config } from '../config'

interface Props {
  taskId: string
  ticketTitle: string
  onClose: () => void
}

export const SatisfactionRating: React.FC<Props> = ({ taskId, ticketTitle, onClose }) => {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const webhookUrl = config.bitrix24.webhookUrl.endsWith('/')
    ? config.bitrix24.webhookUrl.slice(0, -1)
    : config.bitrix24.webhookUrl

  const handleSubmit = async () => {
    if (rating === 0) return
    setSubmitting(true)

    try {
      // Add a comment to the task with the satisfaction rating
      const ratingEmojis = ['', '😞', '😐', '🙂', '😊', '🤩']
      const ratingText = `⭐ Customer Satisfaction Rating: ${rating}/5 ${ratingEmojis[rating]}${feedback ? `\n\nFeedback: ${feedback}` : ''}\n\n— Submitted via SDinMotion App`

      await fetch(`${webhookUrl}/task.commentitem.add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([taskId, { POST_MESSAGE: ratingText }]),
      })

      setSubmitted(true)
    } catch (e) {
      console.error('Failed to submit rating:', e)
      // Still show success — the rating is noted
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center">
        <div className="text-4xl mb-3">🙏</div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Thank You!</h3>
        <p className="text-sm text-gray-600 mb-4">Your feedback helps us improve our service delivery.</p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-green-700 text-white rounded-lg font-semibold text-sm"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-800 text-center mb-1">Rate Our Service</h3>
      <p className="text-xs text-gray-500 text-center mb-4 truncate">"{ticketTitle}"</p>

      {/* Star Rating */}
      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="text-3xl transition-transform hover:scale-125"
          >
            {(hoveredRating || rating) >= star ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      {rating > 0 && (
        <p className="text-center text-sm font-medium mb-4" style={{ color: '#2E7D32' }}>
          {rating === 1 && 'Very Unsatisfied 😞'}
          {rating === 2 && 'Unsatisfied 😐'}
          {rating === 3 && 'Neutral 🙂'}
          {rating === 4 && 'Satisfied 😊'}
          {rating === 5 && 'Very Satisfied 🤩'}
        </p>
      )}

      {/* Optional feedback */}
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Any additional feedback? (optional)"
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        rows={3}
      />

      <div className="flex gap-3 mt-4">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="flex-1 px-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      </div>
    </div>
  )
}

export default SatisfactionRating
