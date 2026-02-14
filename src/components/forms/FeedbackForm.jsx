import { useState } from 'react'
import toast from 'react-hot-toast'
import apiHelper from '../../helper/apiHelper'
import { useAuth } from '../../context/AuthContext' // for display only; backend sets userId from token when logged in

export default function FeedbackForm({ onSubmit, onCancel, feedbackType = 'feedback' }) {
  const { userId } = useAuth()
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = feedback.trim()
    if (!text) return
    setSubmitting(true)
    try {
      await apiHelper.post('/api/feedback', { feedback: text, feedbackType })
      onSubmit?.()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit feedback'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-300 mb-1">
          Your feedback
        </label>
        <textarea
          id="feedback-text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          required
          rows={4}
          placeholder="Tell us what you think..."
          className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y min-h-[100px]"
        />
      </div>
      {userId && (
        <p className="text-xs text-gray-500">
          Submitting as logged-in user. Your account will be linked to this feedback.
        </p>
      )}
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
    </form>
  )
}
