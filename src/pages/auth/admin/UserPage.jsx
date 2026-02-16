import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import apiHelper from '../../../helper/apiHelper'
import DataTable from '../../../components/DataTable'
import Modal from '../../../components/Modal'
import UserForm from '../../../components/forms/UserForm'

const COLUMNS = [
  { key: 'email', label: 'Email' },
  {
    key: 'isActive',
    label: 'Status',
    render: (row) => (
      <span
        className={`inline-block text-xs px-2 py-0.5 rounded ${
          row.isActive ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'
        }`}
      >
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    key: 'isAdmin',
    label: 'Role',
    render: (row) => (
      <span
        className={`inline-block text-xs px-2 py-0.5 rounded ${
          row.isAdmin ? 'bg-amber-900/50 text-amber-300' : 'bg-gray-700 text-gray-400'
        }`}
      >
        {row.isAdmin ? 'Admin' : 'User'}
      </span>
    ),
  },
  {
    key: 'adFree',
    label: 'Ad-free',
    render: (row) => (
      <span
        className={`inline-block text-xs px-2 py-0.5 rounded ${
          row.adFree ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-700 text-gray-400'
        }`}
      >
        {row.adFree ? 'Yes' : 'No'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    label: 'Created',
    render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'),
  },
]

const UserPage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const fetchUsers = useCallback(async (pageNum = 1) => {
    setLoading(true)
    try {
      const { data } = await apiHelper.get('/api/users', { params: { page: pageNum, limit: 10 } })
      setUsers(data?.data ?? [])
      if (data?.pagination) {
        setPagination({
          page: data.pagination.page,
          totalPages: data.pagination.totalPages,
          total: data.pagination.total,
          limit: data.pagination.limit,
        })
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load users'
      toast.error(msg)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(page)
  }, [page, fetchUsers])

  const handleEdit = (user) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleSubmit = async (payload) => {
    if (!editingUser?._id) return
    try {
      await apiHelper.put(`/api/users/${editingUser._id}`, payload)
      toast.success('User updated')
      setModalOpen(false)
      setEditingUser(null)
      fetchUsers(page)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update user'
      toast.error(msg)
    }
  }

  const handleCancel = () => {
    setModalOpen(false)
    setEditingUser(null)
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
        <h1 className="text-2xl font-semibold text-gray-100 mb-6">Users</h1>

        <DataTable
          columns={COLUMNS}
          data={users}
          loading={loading}
          pagination={{
            ...pagination,
            onPageChange: setPage,
          }}
          actions={(row) => (
            <button
              type="button"
              onClick={() => handleEdit(row)}
              className="text-amber-400 hover:text-amber-300 text-sm font-medium"
            >
              Edit
            </button>
          )}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={handleCancel}
        title={editingUser ? `Edit ${editingUser.email}` : 'Edit user'}
      >
        {editingUser && (
          <UserForm
            key={editingUser._id}
            initialValues={editingUser}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}
      </Modal>
    </div>
  )
}

export default UserPage
