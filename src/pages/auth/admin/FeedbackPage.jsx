import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MessageSquare } from 'lucide-react'
import apiHelper from '../../../helper/apiHelper'
import DataTable from '../../../components/DataTable'

const COLUMNS = [
  {
    key: 'feedback',
    label: 'Feedback',
    render: (row) => (
      <span className="text-gray-200 text-sm line-clamp-2 max-w-[320px]" title={row.feedback}>
        {row.feedback || '—'}
      </span>
    ),
  },
  {
    key: 'feedbackType',
    label: 'Type',
    render: (row) => (
      <span className="capitalize text-gray-300">{row.feedbackType || '—'}</span>
    ),
  },
  {
    key: 'userId',
    label: 'User',
    render: (row) => {
      const u = row.userId
      const email = typeof u === 'object' ? u?.email : null
      return (
        <span className="text-gray-400 text-sm truncate max-w-[180px] block" title={email || 'Guest'}>
          {email || '—'}
        </span>
      )
    },
  },
  {
    key: 'createdAt',
    label: 'Date',
    render: (row) => (
      <span className="text-gray-400 text-sm">
        {row.createdAt
          ? new Date(row.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—'}
      </span>
    ),
  },
]

export default function FeedbackPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiHelper.get('/api/feedback')
      setList(Array.isArray(data?.data) ? data.data : [])
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load feedback'
      toast.error(msg)
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const handleDelete = async (row) => {
    if (!window.confirm('Delete this feedback?')) return
    try {
      await apiHelper.delete(`/api/feedback/${row._id}`)
      toast.success('Feedback deleted')
      fetchFeedback()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm text-gray-400 hover:text-amber-400 mb-6"
        >
          &larr; Back to Admin
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-amber-400" aria-hidden />
            Feedback
          </h1>
        </div>

        <DataTable
          columns={COLUMNS}
          data={list}
          loading={loading}
          actions={(row) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDelete(row)}
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          )}
        />

        {!loading && list.length === 0 && (
          <p className="text-center text-gray-500 mt-4 text-sm">No feedback yet.</p>
        )}
      </div>
    </div>
  )
}
