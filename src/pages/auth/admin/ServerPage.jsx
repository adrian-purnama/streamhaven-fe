import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import apiHelper from '../../../helper/apiHelper'
import DataTable from '../../../components/DataTable'
import Modal from '../../../components/Modal'
import ServerForm from '../../../components/forms/ServerForm'

const EMBED_GUIDE = [
  {
    where: 'Watch / Play page',
    file: 'frontend/src/pages/WatchNowPage.jsx',
    what: 'Fetches servers by type (movie/tv) and shows "Watch on [Server]" buttons. Each button opens: Link + watchPathPattern with {externalId} replaced by the TMDB id.',
    howToModify: 'Edit WatchNowPage.jsx: change how watchUrl is built (e.g. add query params, use different id), or add an iframe embed instead of opening in a new tab.',
  },
  {
    where: 'API used by Watch page',
    file: 'GET /api/servers?usedFor=movie or ?usedFor=tv',
    what: 'Returns servers that support that type, sorted by newest first.',
    howToModify: 'Backend: backend/routes/data entry/server.route.js (GET /). Add more query filters if needed.',
  },
]

function EmbedGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-10 rounded-xl border border-gray-700 bg-gray-800/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-gray-200 hover:bg-gray-700/30 transition-colors"
      >
        <span className="font-medium">Where are servers used & how to modify</span>
        <span className="text-gray-500" aria-hidden>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-700">
          {EMBED_GUIDE.map((item, i) => (
            <div key={i} className="pt-3">
              <p className="text-amber-400 font-medium text-sm">{item.where}</p>
              <p className="text-gray-400 text-xs font-mono mt-0.5">{item.file}</p>
              <p className="text-gray-300 text-sm mt-1">{item.what}</p>
              <p className="text-gray-500 text-xs mt-1">
                <span className="text-gray-400">How to modify:</span> {item.howToModify}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const COLUMNS = [
  {
    key: 'label',
    label: 'Label',
    render: (row) => (
      <span className="text-gray-200 font-medium">
        {row.label || '—'}
      </span>
    ),
  },
  {
    key: 'link',
    label: 'Link',
    render: (row) => (
      <a
        href={row.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-400 hover:text-amber-300 truncate max-w-[180px] md:max-w-none block"
      >
        {row.link}
      </a>
    ),
  },
  {
    key: 'usedFor',
    label: 'Used for',
    render: (row) => (
      <div className="flex flex-wrap gap-1">
        {(row.usedFor || []).map((v) => (
          <span
            key={v}
            className="inline-block text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 capitalize"
          >
            {v}
          </span>
        ))}
        {(row.usedFor || []).length === 0 && (
          <span className="text-gray-500 text-xs">—</span>
        )}
      </div>
    ),
  },
]

const ServerPage = () => {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState(null)

  const fetchServers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiHelper.get('/api/servers')
      setServers(data?.data ?? [])
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load servers'
      toast.error(msg)
      setServers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const handleAdd = () => {
    setEditingServer(null)
    setModalOpen(true)
  }

  const handleEdit = (row) => {
    setEditingServer(row)
    setModalOpen(true)
  }

  const handleSubmit = async (payload) => {
    try {
      if (editingServer?._id) {
        await apiHelper.put(`/api/servers/${editingServer._id}`, payload)
        toast.success('Server updated')
      } else {
        await apiHelper.post('/api/servers', payload)
        toast.success('Server created')
      }
      setModalOpen(false)
      setEditingServer(null)
      fetchServers()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save server'
      toast.error(msg)
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete server "${row.link}"?`)) return
    try {
      await apiHelper.delete(`/api/servers/${row._id}`)
      toast.success('Server deleted')
      fetchServers()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete server'
      toast.error(msg)
    }
  }

  const handleCancel = () => {
    setModalOpen(false)
    setEditingServer(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center text-sm text-gray-400 hover:text-amber-400 mb-6"
        >
          ← Back to Admin
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-gray-100">Servers</h1>
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Add server
          </button>
        </div>

        <DataTable
          columns={COLUMNS}
          data={servers}
          loading={loading}
          actions={(row) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleEdit(row)}
                className="text-amber-400 hover:text-amber-300 text-sm font-medium"
              >
                Edit
              </button>
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

        {/* Embed guide: where servers are used and how to modify */}
        <EmbedGuide />
      </div>

      <Modal
        open={modalOpen}
        onClose={handleCancel}
        title={editingServer ? 'Edit server' : 'Add server'}
      >
        <ServerForm
          key={editingServer?._id ?? 'new'}
          initialValues={editingServer ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isCreate={!editingServer}
        />
      </Modal>
    </div>
  )
}

export default ServerPage
