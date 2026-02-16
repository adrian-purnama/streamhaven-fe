import { useState, useEffect, useCallback } from 'react'
import { Waypoints } from 'lucide-react'
import apiHelper from '../../helper/apiHelper'
import Modal from '../Modal'
import SearchMovieForm from '../forms/SearchMovieForm'

const PAGE_SIZE = 20

function MappingTab() {
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [remapItem, setRemapItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredList = list.filter((item) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    const title = (item.title || '').toLowerCase()
    const filename = (item.filename || '').toLowerCase()
    const slug = (item.abyssSlug || '').toLowerCase()
    const tid = String(item.externalId ?? '')
    return title.includes(q) || filename.includes(q) || slug.includes(q) || tid.includes(q)
  })

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await apiHelper.get('/api/uploaded-videos', {
        params: { limit: PAGE_SIZE, skip },
      })
      if (data?.success && data?.data) {
        setList(data.data.list ?? [])
        setTotal(data.data.total ?? 0)
      }
    } catch {
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [skip])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const saveMapping = async (item) => {
    const id = item._id
    setSavingId(id)
    try {
      const payload = {
        externalId: item.externalId === '' || item.externalId == null ? null : Number(item.externalId),
        title: item.title ?? '',
        poster_path: item.poster_path === '' ? null : (item.poster_path || null),
      }
      const { data } = await apiHelper.patch(`/api/uploaded-videos/${id}`, payload)
      if (data?.success && data?.data) {
        setList((prev) => prev.map((it) => (it._id === id ? { ...it, ...data.data } : it)))
      }
    } catch {
      // leave list as-is
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (item) => {
    if (!item?.abyssSlug) return
    if (!window.confirm(`Delete "${item.title || item.filename || item.abyssSlug}" from Abyss and the database? This cannot be undone.`)) return
    setDeletingId(item._id)
    try {
      const { data } = await apiHelper.delete(`/api/abyss/delete-video/${encodeURIComponent(item.abyssSlug)}`)
      if (data?.success) {
        setList((prev) => prev.filter((it) => it._id !== item._id))
        setTotal((t) => Math.max(0, t - 1))
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete failed'
      window.alert(msg)
    } finally {
      setDeletingId(null)
    }
  }

  const confirmRemap = useCallback(
    (movie) => {
      if (!movie || !remapItem) return
      const updated = {
        ...remapItem,
        externalId: movie.id ?? remapItem.externalId,
        title: movie.title ?? remapItem.title ?? '',
        poster_path: movie.poster_path ?? remapItem.poster_path ?? '',
      }
      setList((prev) => prev.map((it) => (it._id === remapItem._id ? updated : it)))
      setRemapItem(null)
      saveMapping(updated)
    },
    [remapItem]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
      
      <div>
        <h3 className="text-gray-200 font-medium mb-4 flex items-center gap-2">
          <Waypoints className="w-5 h-5 shrink-0 text-amber-400" />
          Abyss Slug - TMDB Mapping
        </h3>
      </div>

        <div className="mb-4">
          <label htmlFor="mapping-search" className="sr-only">Search mapping</label>
          <input
            id="mapping-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, filename, slug, TMDB id…"
            className="w-full max-w-md px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {loading ? (
          <p className="text-gray-500 text-sm py-8">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-gray-500 text-sm py-8">No uploaded videos yet.</p>
        ) : filteredList.length === 0 ? (
          <p className="text-gray-500 text-sm py-8">No matches for &quot;{searchQuery.trim()}&quot;.</p>
        ) : (
          <>
            <ul className="space-y-4">
              {filteredList.map((item) => (
                <li
                  key={item._id}
                  className="flex flex-wrap gap-4 p-4 rounded-lg border border-gray-700 bg-gray-800/50"
                >
                  <div className="shrink-0 w-20 h-[120px] rounded-lg overflow-hidden bg-gray-700">
                    {item.poster_url ? (
                      <img src={item.poster_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No poster</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <p className="text-gray-200 font-medium truncate">{item.title || item.filename || '—'}</p>
                    <p className="text-gray-500 text-xs">
                      External Link:{' '}
                      {(item.abyss_links || []).length === 0 ? (
                        '—'
                      ) : (
                        (item.abyss_links || []).map((link, i) => (
                          <a
                            key={link.link ? `${link.link}-${i}` : i}
                            href={link.link || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:underline mr-2"
                          >
                            {link.label} - {link.link}
                          </a>
                        ))
                      )}
                    </p>
                    {item.externalId != null && (
                      <p className="text-gray-400 text-xs">TMDB ID: {item.externalId}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setRemapItem(item)}
                        disabled={savingId === item._id || deletingId === item._id}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-gray-900 text-sm font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingId === item._id ? 'Saving…' : 'Remap'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={savingId === item._id || deletingId === item._id}
                        className="px-3 py-1.5 rounded-lg border border-red-500/60 text-red-400 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === item._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <p className="text-gray-500 text-sm">
                  {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
                    disabled={skip === 0}
                    className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkip((s) => s + PAGE_SIZE)}
                    disabled={skip + PAGE_SIZE >= total}
                    className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={remapItem != null}
        onClose={() => setRemapItem(null)}
        title="Remap to TMDB movie"
      >
        <div className="space-y-4">
          {remapItem && (
            <div className="p-3 rounded-lg bg-gray-700/50 border border-gray-600">
              <p className="text-gray-300 font-medium text-sm mb-1">Video to remap</p>
              <p className="text-gray-200 truncate">{remapItem.title || remapItem.filename || '—'}</p>
              <p className="text-gray-500 text-xs mt-0.5">Abyss: {remapItem.abyssSlug}</p>
              {remapItem.externalId != null && (
                <p className="text-gray-400 text-xs mt-0.5">Current TMDB ID: {remapItem.externalId}</p>
              )}
            </div>
          )}
          <SearchMovieForm
            placeholder="Old or new IMDB (tt…) or TMDB id"
            description="Enter old or new TMDB/IMDB id, then click Remap below to confirm."
            renderActions={(movie) => (
              <button
                type="button"
                onClick={() => confirmRemap(movie)}
                className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Remap
              </button>
            )}
          />
        </div>
      </Modal>
    </div>
  )
}

export default MappingTab

