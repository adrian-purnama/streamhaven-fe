import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import apiHelper from '../../helper/apiHelper'
import {
  getGuestSaved,
  createGuestFolder,
  addGuestSavedItem,
  removeGuestSavedItem,
  GUEST_MAX_FOLDERS,
  GUEST_MAX_SAVED_PER_FOLDER,
} from '../../helper/savedHelper'

const MAX_FOLDERS_LOGGED_IN = 5
const MAX_SAVED_PER_FOLDER_LOGGED_IN = 50

/**
 * Form: list all folders; click folder to add item there or remove if already saved. Create folder when none exist.
 * @param {{ item: { externalId: number, mediaType: 'movie'|'tv', title: string, category?: string, vote_average?: number, release_date?: string, genre_ids?: number[], overview?: string, episode_group?: object }, onCancel: () => void, onSaved?: () => void }} props
 */
function SaveForm({ item, onCancel, onSaved }) {
  const { isLoggedIn } = useAuth()
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState(null) // folder id being add/remove
  const [error, setError] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [creating, setCreating] = useState(false)

  const externalId = item ? Number(item.externalId) : 0
  const mediaType = item?.mediaType === 'tv' ? 'tv' : 'movie'

  const isItemInFolder = useCallback(
    (folder) => {
      const list = folder.saved || []
      return list.some(
        (s) => Number(s.externalId) === externalId && (s.mediaType || 'movie') === mediaType
      )
    },
    [externalId, mediaType]
  )

  const getSavedEntryInFolder = useCallback(
    (folder) => {
      const list = folder.saved || []
      return list.find(
        (s) => Number(s.externalId) === externalId && (s.mediaType || 'movie') === mediaType
      )
    },
    [externalId, mediaType]
  )

  const buildItemPayload = useCallback(
    () => ({
      externalId,
      mediaType,
      title: typeof item.title === 'string' ? item.title.trim() : String(item?.title || ''),
      poster_url: typeof item.poster_url === 'string' ? item.poster_url : '',
      category: typeof item.category === 'string' ? item.category : '',
      vote_average: Number(item.vote_average) || 0,
      release_date: typeof item.release_date === 'string' ? item.release_date : '',
      genre_ids: Array.isArray(item.genre_ids) ? item.genre_ids : [],
      overview: typeof item.overview === 'string' ? item.overview : '',
      episode_group:
        item.episode_group && typeof item.episode_group === 'object'
          ? {
              episode_count: Number(item.episode_group.episode_count) || 0,
              group_count: Number(item.episode_group.group_count) || 0,
            }
          : { episode_count: 0, group_count: 0 },
    }),
    [item, externalId, mediaType]
  )

  const refreshFolders = useCallback(() => {
    if (isLoggedIn) {
      return apiHelper.get('/api/users/me/folders').then(({ data }) => {
        if (data?.success && Array.isArray(data.data)) {
          setFolders(data.data)
        }
      })
    }
    const { folders: guestFolders } = getGuestSaved()
    setFolders(guestFolders)
    return Promise.resolve()
  }, [isLoggedIn])

  useEffect(() => {
    let cancelled = false
    setError('')
    if (isLoggedIn) {
      setLoading(true)
      apiHelper
        .get('/api/users/me/folders')
        .then(({ data }) => {
          if (!cancelled && data?.success && Array.isArray(data.data)) {
            setFolders(data.data)
          }
        })
        .catch((err) => {
          if (!cancelled) {
            const msg = err.response?.data?.message || err.message || 'Failed to load folders'
            setError(msg)
            toast.error(msg)
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
      const { folders: guestFolders } = getGuestSaved()
      setFolders(guestFolders)
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [isLoggedIn])

  const handleFolderClick = async (folder) => {
    const id = folder._id ?? folder.id
    if (!id || !item?.externalId || !item?.title) return

    const inFolder = isItemInFolder(folder)
    const atLimit = !inFolder && (isLoggedIn ? (folder.saved?.length || 0) >= MAX_SAVED_PER_FOLDER_LOGGED_IN : (folder.saved?.length || 0) >= GUEST_MAX_SAVED_PER_FOLDER)
    if (!inFolder && atLimit) {
      toast.error(isLoggedIn ? 'Folder is full (50 items max)' : `Folder is full (${GUEST_MAX_SAVED_PER_FOLDER} items max)`)
      return
    }

    setTogglingId(id)
    setError('')
    try {
      if (inFolder) {
        const savedEntry = getSavedEntryInFolder(folder)
        const savedItemId = savedEntry?._id ?? savedEntry?.id
        if (!savedItemId) {
          toast.error('Could not find saved item')
          return
        }
        if (isLoggedIn) {
          await apiHelper.delete(`/api/users/me/folders/${id}/saved/${savedItemId}`)
        } else {
          removeGuestSavedItem(id, savedItemId)
        }
        toast.success('Removed from list')
      } else {
        const payload = buildItemPayload()
        if (isLoggedIn) {
          await apiHelper.post(`/api/users/me/folders/${id}/saved`, payload)
        } else {
          addGuestSavedItem(id, payload)
        }
        toast.success('Saved to list')
      }
      await refreshFolders()
      if (typeof onSaved === 'function') {
        onSaved()
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || (inFolder ? 'Failed to remove' : 'Failed to save')
      setError(msg)
      toast.error(msg)
    } finally {
      setTogglingId(null)
    }
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    const name = typeof newFolderName === 'string' ? newFolderName.trim() : ''
    if (!name) {
      setError('Enter a folder name')
      return
    }
    if (!item?.externalId || !item?.title) {
      setError('Missing show information')
      return
    }
    const maxFolders = isLoggedIn ? MAX_FOLDERS_LOGGED_IN : GUEST_MAX_FOLDERS
    if (folders.length >= maxFolders) {
      toast.error(`Maximum ${maxFolders} folders`)
      return
    }
    setCreating(true)
    setError('')
    try {
      let newFolderId
      if (isLoggedIn) {
        const { data } = await apiHelper.post('/api/users/me/folders', { name, description: '' })
        if (!data?.success || !data?.data?._id) throw new Error('Failed to create folder')
        newFolderId = data.data._id
      } else {
        const folder = createGuestFolder(name)
        newFolderId = folder.id
      }
      const payload = buildItemPayload()
      if (isLoggedIn) {
        await apiHelper.post(`/api/users/me/folders/${newFolderId}/saved`, payload)
      } else {
        addGuestSavedItem(newFolderId, payload)
      }
      setNewFolderName('')
      toast.success('Folder created and saved')
      await refreshFolders()
      if (typeof onSaved === 'function') {
        onSaved()
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create folder'
      setError(msg)
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const canCreateFolder = isLoggedIn ? folders.length < MAX_FOLDERS_LOGGED_IN : folders.length < GUEST_MAX_FOLDERS

  if (loading) {
    return (
      <div className="py-4 text-gray-400 text-center">
        Loading folders…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <p className="text-sm text-gray-400">
        Click a folder to save here or remove from it.
      </p>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {folders.map((f) => {
          const id = f._id ?? f.id
          const name = f.name || 'Folder'
          const count = (f.saved || []).length
          const saved = isItemInFolder(f)
          const atLimit = isLoggedIn ? count >= MAX_SAVED_PER_FOLDER_LOGGED_IN : count >= GUEST_MAX_SAVED_PER_FOLDER
          const busy = togglingId === id
          return (
            <button
              key={id}
              type="button"
              disabled={!saved && atLimit}
              onClick={() => handleFolderClick(f)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                saved
                  ? 'border-amber-500/80 bg-amber-500/10 text-amber-200'
                  : 'border-gray-600 bg-gray-700/50 text-gray-200 hover:bg-gray-700'
              }`}
            >
              <span className="flex-1 font-medium">{name}</span>
              <span className="text-gray-500 text-sm">{count} items</span>
              {saved && (
                <span className="text-xs font-medium text-amber-400">Saved</span>
              )}
              {busy && <span className="text-xs text-gray-400">…</span>}
            </button>
          )
        })}
      </div>

      {canCreateFolder && (
        <form onSubmit={handleCreateFolder} className="flex gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name"
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={creating || !newFolderName.trim()}
            className="px-4 py-2 rounded bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? '…' : 'Create & save'}
          </button>
        </form>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded bg-gray-600 text-gray-200 hover:bg-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Done
        </button>
      </div>
    </div>
  )
}

export default SaveForm
