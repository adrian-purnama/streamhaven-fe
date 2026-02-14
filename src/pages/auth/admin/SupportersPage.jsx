import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Crown, Medal, Award, Shield, BadgeCheck } from 'lucide-react'
import apiHelper from '../../../helper/apiHelper'
import DataTable from '../../../components/DataTable'
import Modal from '../../../components/Modal'
import SupporterForm from '../../../components/forms/SupporterForm'

const TABS = [
  { key: 'platinum', label: 'Platinum', Icon: Crown, color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-400/40', ring: 'ring-cyan-400' },
  { key: 'gold', label: 'Gold', Icon: Medal, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-400/40', ring: 'ring-amber-400' },
  { key: 'silver', label: 'Silver', Icon: Award, color: 'text-gray-300', bg: 'bg-gray-400/10', border: 'border-gray-400/40', ring: 'ring-gray-400' },
  { key: 'bronze', label: 'Bronze', Icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-400/40', ring: 'ring-orange-400' },
]

const COLUMNS = [
  {
    key: 'displayName',
    label: 'Display name',
    render: (row) => (
      <span className="inline-flex items-center gap-1.5 text-gray-100 font-medium">
        {row.displayName}
        {row.isVerified && <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0" aria-label="Verified" />}
      </span>
    ),
  },
  {
    key: 'order',
    label: 'Order',
    render: (row) => <span className="text-gray-300 tabular-nums">{row.order}</span>,
  },
  {
    key: 'tagLine',
    label: 'Message',
    render: (row) => (
      <span className="text-gray-400 text-xs italic line-clamp-2 max-w-[180px] block">
        {row.tagLine || '—'}
      </span>
    ),
  },
  {
    key: 'links',
    label: 'Links',
    render: (row) => (
      <div className="flex flex-wrap gap-1.5">
        {(row.links || []).map((l, i) => (
          <a
            key={i}
            href={l.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-700 text-amber-400 hover:text-amber-300 hover:bg-gray-600 transition-colors"
            title={l.link}
          >
            {l.icon && <span className="text-gray-400">{l.icon}</span>}
            {l.label}
          </a>
        ))}
        {(row.links || []).length === 0 && <span className="text-gray-500 text-xs">—</span>}
      </div>
    ),
  },
  {
    key: 'userId',
    label: 'User ID',
    render: (row) => {
      const id = typeof row.userId === 'object' ? row.userId?._id : row.userId
      return (
        <span className="text-gray-400 font-mono text-xs truncate max-w-[120px] block" title={id}>
          {id}
        </span>
      )
    },
  },
]

function SupportersPage() {
  const [activeTab, setActiveTab] = useState('platinum')
  const [supporters, setSupporters] = useState({ platinum: [], gold: [], silver: [], bronze: [] })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSupporter, setEditingSupporter] = useState(null)

  const fetchSupporters = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiHelper.get('/api/supporters')
      const d = data?.data ?? {}
      setSupporters({
        platinum: d.platinum ?? [],
        gold: d.gold ?? [],
        silver: d.silver ?? [],
        bronze: d.bronze ?? [],
      })
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load supporters'
      toast.error(msg)
      setSupporters({ platinum: [], gold: [], silver: [], bronze: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSupporters()
  }, [fetchSupporters])

  const handleAdd = () => {
    setEditingSupporter(null)
    setModalOpen(true)
  }

  const handleEdit = (row) => {
    setEditingSupporter(row)
    setModalOpen(true)
  }

  const handleSubmit = async (payload) => {
    try {
      if (editingSupporter?._id) {
        await apiHelper.patch(`/api/supporters/${editingSupporter._id}`, payload)
        toast.success('Supporter updated')
      } else {
        // Default the tier to whatever tab is active when creating
        const finalPayload = { ...payload, supporterType: payload.supporterType || activeTab }
        await apiHelper.post('/api/supporters', finalPayload)
        toast.success('Supporter created')
      }
      setModalOpen(false)
      setEditingSupporter(null)
      fetchSupporters()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save supporter'
      toast.error(msg)
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete supporter "${row.displayName}"?`)) return
    try {
      await apiHelper.delete(`/api/supporters/${row._id}`)
      toast.success('Supporter deleted')
      fetchSupporters()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete supporter'
      toast.error(msg)
    }
  }

  const handleCancel = () => {
    setModalOpen(false)
    setEditingSupporter(null)
  }

  const currentTab = TABS.find((t) => t.key === activeTab) || TABS[0]
  const currentData = supporters[activeTab] || []

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
          <h1 className="text-2xl font-semibold text-gray-100">Supporters</h1>
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            Add supporter
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const TabIcon = tab.Icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${isActive
                    ? `${tab.bg} ${tab.color} border ${tab.border} shadow-sm`
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'
                  }
                `}
              >
                <TabIcon className="w-4 h-4" aria-hidden />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/10' : 'bg-gray-700'}`}>
                  {(supporters[tab.key] || []).length}
                </span>
              </button>
            )
          })}
        </div>

        {/* Table */}
        <DataTable
          columns={COLUMNS}
          data={currentData}
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

        {!loading && currentData.length === 0 && (
          <p className="text-center text-gray-500 mt-4 text-sm">
            No {currentTab.label.toLowerCase()} supporters yet. Click &ldquo;Add supporter&rdquo; to create one.
          </p>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={handleCancel}
        title={editingSupporter ? 'Edit supporter' : 'Add supporter'}
      >
        <SupporterForm
          key={editingSupporter?._id ?? 'new'}
          initialValues={editingSupporter ? editingSupporter : { supporterType: activeTab }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isCreate={!editingSupporter}
        />
      </Modal>
    </div>
  )
}

export default SupportersPage
