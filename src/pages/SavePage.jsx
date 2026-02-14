import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Folder, Pencil, Trash2, X, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import apiHelper from '../helper/apiHelper'
import {
  getGuestSaved,
  removeGuestSavedItem,
  deleteGuestFolder,
  updateGuestFolder,
} from '../helper/savedHelper'
import Modal from '../components/Modal'
import Poster from '../components/Poster'
import PosterGrid from '../components/PosterGrid'

const COLLAPSED_FOLDERS_KEY = 'streamhaven_savePage_collapsedFolders'

function loadCollapsedFolders() {
  try {
    const raw = localStorage.getItem(COLLAPSED_FOLDERS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set()
  } catch {
    return new Set()
  }
}

function saveCollapsedFolders(set) {
  try {
    localStorage.setItem(COLLAPSED_FOLDERS_KEY, JSON.stringify([...set]))
  } catch {
    // ignore quota / private mode
  }
}

export default function SavePage() {
  const { isLoggedIn } = useAuth()
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { folderId, folderName }
  const [removingId, setRemovingId] = useState(null) // folderId-savedItemId
  const [deletingFolderId, setDeletingFolderId] = useState(null)
  const [renamingFolder, setRenamingFolder] = useState(null) // { folderId, name }
  const [renameValue, setRenameValue] = useState('')
  const [collapsedFolders, setCollapsedFolders] = useState(loadCollapsedFolders)

  const refreshFolders = useCallback(() => {
    if (isLoggedIn) {
      return apiHelper
        .get('/api/users/me/folders')
        .then(({ data }) => {
          if (data?.success && Array.isArray(data.data)) {
            setFolders(data.data)
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || err.message || 'Failed to load folders')
        })
    }
    const { folders: guestFolders } = getGuestSaved()
    setFolders(guestFolders)
    return Promise.resolve()
  }, [isLoggedIn])

  useEffect(() => {
    setLoading(true)
    setError('')
    refreshFolders().finally(() => setLoading(false))
  }, [refreshFolders])

  const getFolderId = (f) => f._id ?? f.id

  const toggleFolderCollapsed = (folderId) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      const id = String(folderId)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    saveCollapsedFolders(collapsedFolders)
  }, [collapsedFolders])

  const handleRemoveSaved = async (folderId, savedItemId) => {
    const key = `${folderId}-${savedItemId}`
    setRemovingId(key)
    try {
      if (isLoggedIn) {
        await apiHelper.delete(`/api/users/me/folders/${folderId}/saved/${savedItemId}`)
      } else {
        removeGuestSavedItem(folderId, savedItemId)
      }
      toast.success('Removed from list')
      await refreshFolders()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }

  const handleDeleteFolder = async () => {
    if (!deleteConfirm) return
    const { folderId } = deleteConfirm
    setDeletingFolderId(folderId)
    try {
      if (isLoggedIn) {
        await apiHelper.delete(`/api/users/me/folders/${folderId}`)
      } else {
        deleteGuestFolder(folderId)
      }
      toast.success('Folder deleted')
      setDeleteConfirm(null)
      await refreshFolders()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete folder')
    } finally {
      setDeletingFolderId(null)
    }
  }

  const startRename = (folder) => {
    const id = getFolderId(folder)
    setRenamingFolder({ folderId: id, name: folder.name || '' })
    setRenameValue(folder.name || '')
  }

  const cancelRename = () => {
    setRenamingFolder(null)
    setRenameValue('')
  }

  const submitRename = async () => {
    if (!renamingFolder) return
    const name = typeof renameValue === 'string' ? renameValue.trim() : ''
    if (!name) {
      toast.error('Enter a folder name')
      return
    }
    const { folderId } = renamingFolder
    try {
      if (isLoggedIn) {
        await apiHelper.put(`/api/users/me/folders/${folderId}`, { name })
      } else {
        updateGuestFolder(folderId, { name })
      }
      toast.success('Folder renamed')
      cancelRename()
      await refreshFolders()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to rename')
    }
  }

  /** Build movie shape for Poster from a saved item */
  const savedItemToMovie = (item) => ({
    _id: item.externalId,
    externalId: item.externalId,
    title: item.title || '',
    overview: item.overview || '',
    release_date: item.release_date || '',
    vote_average: item.vote_average,
    genre_ids: item.genre_ids || [],
    episode_group: item.episode_group,
    category: item.category,
    poster_url: item.poster_url,
  })

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-400">Loading your lists…</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
          {/* <Folder className="w-7 h-7 text-amber-500" aria-hidden /> */}
          saved lists
        </h1>
        {!isLoggedIn && (
          <p className="text-sm text-gray-500">Stored locally. Sign in to sync across devices.</p>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4" role="alert">
          {error}
        </p>
      )}

      {folders.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-8 text-center text-gray-400">
          <p>No folders yet.</p>
          <p className="text-sm mt-2">Save movies or shows from Discover, Movies, or TV to create lists.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {folders.map((folder) => {
            const folderId = getFolderId(folder)
            const saved = folder.saved || []
            const isRenaming = renamingFolder?.folderId === folderId
            const isCollapsed = collapsedFolders.has(String(folderId))

            return (
              <section
                key={folderId}
                className="rounded-xl border border-gray-700 bg-gray-800/50 overflow-hidden"
              >
                {/* Folder header */}
                <div className="flex items-center gap-2 flex-wrap p-4 border-b border-gray-700">
                  <button
                    type="button"
                    onClick={() => toggleFolderCollapsed(folderId)}
                    className="p-0.5 rounded text-gray-400 hover:text-amber-400 hover:bg-gray-700 -m-0.5"
                    title={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5" aria-hidden />
                    ) : (
                      <ChevronDown className="w-5 h-5" aria-hidden />
                    )}
                  </button>
                  {isRenaming ? (
                    <>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename()
                          if (e.key === 'Escape') cancelRename()
                        }}
                        className="flex-1 min-w-48 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={submitRename}
                        className="px-3 py-2 rounded-lg bg-amber-500 text-gray-900 text-sm font-medium hover:bg-amber-400 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" aria-hidden />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="px-3 py-2 rounded-lg bg-gray-600 text-gray-200 text-sm font-medium hover:bg-gray-500 flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" aria-hidden />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <Folder className="w-5 h-5 text-amber-500/80" aria-hidden />
                      <h2 className="text-lg font-semibold text-gray-100 flex-1">{folder.name || 'Folder'}</h2>
                      <span className="text-gray-500 text-sm">{saved.length} item{saved.length !== 1 ? 's' : ''}</span>
                      <button
                        type="button"
                        onClick={() => startRename(folder)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-amber-400 hover:bg-gray-700 flex items-center gap-1.5"
                        title="Rename folder"
                      >
                        <Pencil className="w-4 h-4" aria-hidden />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ folderId, folderName: folder.name || 'Folder' })}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-1.5"
                        title="Delete folder"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                        Delete folder
                      </button>
                    </>
                  )}
                </div>

                {/* Saved items as posters — hidden when collapsed */}
                {!isCollapsed && (
                  <div className="p-4">
                    {saved.length === 0 ? (
                      <p className="text-gray-500 text-sm">No items in this folder.</p>
                    ) : (
                      // <PosterGrid>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">

                        {saved.map((item) => {
                          const savedItemId = item._id ?? item.id
                          const key = `${folderId}-${savedItemId}`
                          const busy = removingId === key
                          const movie = savedItemToMovie(item)
                          const mediaType = item.mediaType === 'tv' ? 'tv' : 'movie'
                          return (
                            <div key={key} className="relative">
                              <Poster
                                movie={movie}
                                mediaType={mediaType}
                                size="sm"
                                className="w-full"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveSaved(folderId, savedItemId)}
                                disabled={busy}
                                className="absolute top-2 right-2 z-10 p-1.5 rounded bg-black/70 text-gray-200 hover:bg-red-600 hover:text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                title="Remove from list"
                                aria-label="Remove from list"
                              >
                                {busy ? (
                                  <span className="text-xs">…</span>
                                ) : (
                                  <X className="w-4 h-4" aria-hidden />
                                )}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    // </PosterGrid>
                  )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* Delete folder confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => !deletingFolderId && setDeleteConfirm(null)}
        title="Delete folder?"
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <p className="text-gray-300">
              Permanently delete &quot;{deleteConfirm.folderName}&quot; and all its saved items?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg bg-gray-600 text-gray-200 font-medium hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFolder}
                disabled={deletingFolderId}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-500 disabled:opacity-50"
              >
                {deletingFolderId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
