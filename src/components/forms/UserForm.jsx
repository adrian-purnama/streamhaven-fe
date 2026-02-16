import React, { useState } from 'react'

const UserForm = ({ initialValues, onSubmit, onCancel }) => {
  const [email, setEmail] = useState(initialValues?.email ?? '')
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true)
  const [isAdmin, setIsAdmin] = useState(initialValues?.isAdmin ?? false)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ email, isActive, isAdmin })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="user-email" className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <input
          id="user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="user@example.com"
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="user-is-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
        />
        <label htmlFor="user-is-active" className="text-sm font-medium text-gray-300">
          Active
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="user-is-admin"
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
        />
        <label htmlFor="user-is-admin" className="text-sm font-medium text-gray-300">
          Admin
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-amber-500 text-gray-900 hover:bg-amber-400 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          Update
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded bg-gray-600 text-gray-200 hover:bg-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default UserForm
