import { useState, useEffect, useCallback, Fragment } from 'react'
import toast from 'react-hot-toast'
import { Waypoints, Pencil, Trash2, Settings, ChevronDown, ChevronRight } from 'lucide-react'
import apiHelper from '../../helper/apiHelper'
import Modal from '../Modal'
import SearchMovieForm from '../forms/SearchMovieForm'

const PAGE_SIZE = 20

const TABS = [
  { id: 'remapping', label: 'Remapping' },
  { id: 'resources', label: 'All resources' },
]

function MappingTab() {
  const [activeTab, setActiveTab] = useState('remapping')
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [remapItem, setRemapItem] = useState(null)
  const [remapSelectedMovie, setRemapSelectedMovie] = useState(null)
  const [remapSeason, setRemapSeason] = useState('')
  const [remapEpisode, setRemapEpisode] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [resourcesData, setResourcesData] = useState(null)
  const [resourcesTotal, setResourcesTotal] = useState(0)
  const [resourcesPage, setResourcesPage] = useState(1)
  const [resourceInfoNode, setResourceInfoNode] = useState(null)
  const [renameInputValue, setRenameInputValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [openTvGroups, setOpenTvGroups] = useState({})
  const [openTvSeasons, setOpenTvSeasons] = useState({})

  const RESOURCES_PAGE_SIZE = 20

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

  const fetchResources = useCallback(async (pageOverride) => {
    const page = pageOverride || resourcesPage
    setResourcesLoading(true)
    try {
      const params = {
        limit: RESOURCES_PAGE_SIZE,
        skip: (page - 1) * RESOURCES_PAGE_SIZE,
      }
      const { data } = await apiHelper.get('/api/abyss/resources', { params })
      if (data?.success && data?.data) {
        setResourcesData(data.data)
        setResourcesTotal(data.data.total ?? 0)
      } else {
        setResourcesData(null)
        setResourcesTotal(0)
      }
    } catch {
      setResourcesData(null)
      setResourcesTotal(0)
    } finally {
      setResourcesLoading(false)
    }
  }, [resourcesPage])

  useEffect(() => {
    if (activeTab === 'resources') fetchResources(resourcesPage)
  }, [activeTab, resourcesPage, fetchResources])

  useEffect(() => {
    if (resourceInfoNode) setRenameInputValue(resourceInfoNode.name ?? '')
  }, [resourceInfoNode])

  useEffect(() => {
    if (!remapItem) {
      setRemapSelectedMovie(null)
      setRemapSeason('')
      setRemapEpisode('')
    }
  }, [remapItem])

  const saveMapping = async (item) => {
    const id = item._id
    const slug = item.abyssSlug
    setSavingId(id ?? slug)
    try {
      const payload = {
        externalId: item.externalId === '' || item.externalId == null ? null : Number(item.externalId),
        title: item.title ?? '',
        poster_path: item.poster_path === '' ? null : (item.poster_path || null),
        ...(item.mediaType ? { mediaType: item.mediaType } : {}),
        ...(item.seasonNumber != null ? { seasonNumber: item.seasonNumber } : {}),
        ...(item.episodeNumber != null ? { episodeNumber: item.episodeNumber } : {}),
      }
      if (id) {
        const { data } = await apiHelper.patch(`/api/uploaded-videos/${id}`, payload)
        if (data?.success && data?.data) {
          setList((prev) => prev.map((it) => (it._id === id ? { ...it, ...data.data } : it)))
          toast.success('Mapping saved')
          return true
        }
        toast.error(data?.message || 'Save failed')
        return false
      }
      if (slug) {
        const { data } = await apiHelper.post('/api/uploaded-videos', { abyssSlug: slug, ...payload })
        if (data?.success) {
          toast.success('Mapping saved')
          return true
        }
        toast.error(data?.message || 'Save failed')
        return false
      }
      return false
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Save failed')
      return false
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (item) => {
    if (!item?.abyssSlug) return
    setDeletingId(item._id)
    try {
      const { data } = await apiHelper.delete(`/api/abyss/delete-video/${encodeURIComponent(item.abyssSlug)}`)
      if (data?.success) {
        setList((prev) => prev.filter((it) => it._id !== item._id))
        setTotal((t) => Math.max(0, t - 1))
        toast.success('Deleted from Abyss and database')
      } else {
        toast.error(data?.message || 'Delete failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Delete failed')
    } finally {
      setDeletingId(null)
      setDeleteConfirm(null)
    }
  }

  const handleRenameResource = async () => {
    if (!resourceInfoNode?.id || !renameInputValue.trim()) return
    setRenaming(true)
    try {
      const { data } = await apiHelper.patch(`/api/abyss/patch-video/${encodeURIComponent(resourceInfoNode.id)}`, {
        fileName: renameInputValue.trim(),
      })
      if (data?.success) {
        setResourceInfoNode((prev) => (prev ? { ...prev, name: renameInputValue.trim() } : null))
        fetchResources()
        toast.success('Resource renamed')
      } else {
        toast.error(data?.message || 'Rename failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Rename failed')
    } finally {
      setRenaming(false)
    }
  }

  const handleDeleteBySlug = async (slug) => {
    if (!slug) return
    setDeletingId(slug)
    try {
      const { data } = await apiHelper.delete(`/api/abyss/delete-video/${encodeURIComponent(slug)}`)
      if (data?.success) {
        fetchResources()
        toast.success('Deleted from Abyss and database')
      } else {
        toast.error(data?.message || 'Delete failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Delete failed')
    } finally {
      setDeletingId(null)
      setDeleteConfirm(null)
    }
  }

  const onConfirmDelete = async () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'remapping') {
      await handleDelete(deleteConfirm.item)
    } else {
      await handleDeleteBySlug(deleteConfirm.slug)
    }
  }

  const confirmRemap = useCallback(
    async (movie) => {
      if (!movie || !remapItem) return
      const mediaType = movie.mediaType === 'tv' ? 'tv' : 'movie'
      let seasonNumber = null
      let episodeNumber = null

      if (mediaType === 'tv') {
        const s = Number(remapSeason)
        const e = Number(remapEpisode)
        if (!Number.isInteger(s) || s < 1 || !Number.isInteger(e) || e < 1) {
          toast.error('Enter valid season and episode numbers for TV mapping')
          return
        }
        seasonNumber = s
        episodeNumber = e
      }

      const updated = {
        ...remapItem,
        externalId: movie.id ?? remapItem.externalId,
        title: movie.title ?? movie.name ?? remapItem.title ?? '',
        poster_path: movie.poster_path ?? remapItem.poster_path ?? '',
        mediaType,
        seasonNumber,
        episodeNumber,
      }
      if (remapItem._id) {
        setList((prev) => prev.map((it) => (it._id === remapItem._id ? updated : it)))
        await saveMapping(updated)
        setRemapItem(null)
      } else {
        const ok = await saveMapping(updated)
        setRemapItem(null)
        if (ok && activeTab === 'resources') fetchResources()
      }
    },
    [remapItem, activeTab, fetchResources, remapSeason, remapEpisode]
  )

  const items = resourcesData?.items ?? []
  const mappeditems = resourcesData?.mappeditems ?? []
  const mapped = items.map((resource, i) => ({ resource, uploadedVideo: mappeditems[i] })).filter((x) => x.uploadedVideo)
  const unmapped = items.map((resource, i) => ({ resource, uploadedVideo: mappeditems[i] })).filter((x) => !x.uploadedVideo)

  const groupedMapped = mapped.reduce((acc, entry) => {
    const { resource, uploadedVideo } = entry
    if (!uploadedVideo) return acc
    const mediaType = uploadedVideo.mediaType === 'tv' ? 'tv' : 'movie'
    if (mediaType === 'tv' && uploadedVideo.externalId != null) {
      const key = `tv-${uploadedVideo.externalId}`
      let group = acc.find((g) => g.key === key)
      if (!group) {
        group = {
          key,
          type: 'tv',
          externalId: uploadedVideo.externalId,
          title: uploadedVideo.title || resource?.name || resource?.title || uploadedVideo.filename || '—',
          posterUrl: uploadedVideo.poster_url || null,
          episodes: [],
        }
        acc.push(group)
      }
      group.episodes.push({ resource, uploadedVideo })
    } else {
      const key = `movie-${uploadedVideo._id || resource?.id}`
      let group = acc.find((g) => g.key === key)
      if (!group) {
        acc.push({
          key,
          type: 'movie',
          resource,
          uploadedVideo,
        })
      }
    }
    return acc
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-1 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'remapping' && (
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
            <ul className="scrollbar-sleek space-y-4 max-h-[420px] overflow-y-auto pr-1">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-gray-900 text-sm font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remap"
                      >
                        <Pencil className="w-4 h-4" />
                        {savingId === item._id ? 'Saving…' : 'Remap'}
                      </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirm({ type: 'remapping', item })}
                                    disabled={savingId === item._id || deletingId === item._id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/60 text-red-400 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
      )}

      {activeTab === 'resources' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
            <h3 className="text-gray-200 font-medium mb-4">All Abyss resources</h3>
            {resourcesLoading ? (
              <p className="text-gray-500 text-sm py-8">Loading resources…</p>
            ) : (
              <>
                <h4 className="text-gray-300 text-sm font-medium mt-4 mb-2">Mapped ({mapped.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-600 text-gray-400">
                        <th className="py-2 pr-4">Slug / ID</th>
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">TMDB ID</th>
                        <th className="py-2 pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedMapped.length === 0 ? (
                        <tr><td colSpan={4} className="py-4 text-gray-500">No mapped items</td></tr>
                      ) : (
                        groupedMapped.map((group) => {
                          if (group.type === 'movie') {
                            const { resource, uploadedVideo } = group
                            const slug = resource?.id
                            const isSaving = remapItem?._id === uploadedVideo?._id && savingId != null
                            const isDeleting = deletingId === slug || deletingId === uploadedVideo?._id
                            const title = uploadedVideo?.title ?? uploadedVideo?.filename ?? '—'
                            return (
                              <tr key={group.key} className="border-b border-gray-700">
                                <td className="py-2 pr-4 font-mono text-gray-300">{slug ?? '—'}</td>
                                <td className="py-2 pr-4">
                                  <div className="flex items-center gap-3">
                                    {uploadedVideo?.poster_url && (
                                      <img
                                        src={uploadedVideo.poster_url}
                                        alt=""
                                        className="w-10 h-14 rounded object-cover shrink-0 border border-gray-600"
                                      />
                                    )}
                                    <span className="text-gray-200 truncate max-w-[220px]" title={title}>{title}</span>
                                  </div>
                                </td>
                                <td className="py-2 pr-4 text-gray-400">
                                  {uploadedVideo?.externalId != null ? uploadedVideo.externalId : '—'}
                                </td>
                                <td className="py-2 pr-4">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setResourceInfoNode(resource)}
                                      className="p-1.5 rounded-lg border border-gray-500/60 text-gray-400 hover:bg-gray-600/50 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Info / Settings"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRemapItem(uploadedVideo)}
                                      disabled={isSaving || isDeleting}
                                      className="p-1.5 rounded-lg bg-amber-500 text-gray-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Remap"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirm({ type: 'resource', slug, label: title || slug })}
                                      disabled={isSaving || isDeleting}
                                      className="p-1.5 rounded-lg border border-red-500/60 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          }

                          const isOpen = !!openTvGroups[group.key]
                          // group.episodes -> group.seasons (per seasonNumber)
                          const seasonsMap = new Map()
                          group.episodes.forEach(({ resource, uploadedVideo }) => {
                            const sn = uploadedVideo?.seasonNumber ?? 0
                            if (!seasonsMap.has(sn)) seasonsMap.set(sn, [])
                            seasonsMap.get(sn).push({ resource, uploadedVideo })
                          })
                          const seasons = Array.from(seasonsMap.entries()).sort(
                            (a, b) => (a[0] || 0) - (b[0] || 0)
                          )

                          return (
                            <Fragment key={group.key}>
                              <tr className="border-b border-gray-700 bg-gray-800/60">
                                <td className="py-2 pr-4">
                                  <button
                                    type="button"
                                    onClick={() => setOpenTvGroups((prev) => ({ ...prev, [group.key]: !isOpen }))}
                                    className="inline-flex items-center gap-2 text-gray-200"
                                  >
                                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    <span className="font-mono text-xs text-gray-400">TV · TMDB {group.externalId}</span>
                                  </button>
                                </td>
                                <td className="py-2 pr-4 flex items-center gap-3">
                                  {group.posterUrl ? (
                                    <img
                                      src={group.posterUrl}
                                      alt=""
                                      className="w-10 h-14 rounded object-cover shrink-0 border border-gray-600"
                                    />
                                  ) : null}
                                  <span className="text-gray-200 truncate max-w-[220px]" title={group.title}>{group.title}</span>
                                </td>
                                <td className="py-2 pr-4 text-gray-400">{group.externalId}</td>
                                <td className="py-2 pr-4 text-gray-500 text-xs">
                                  {group.episodes.length} episode{group.episodes.length !== 1 ? 's' : ''}
                                </td>
                              </tr>
                              {isOpen &&
                                seasons.map(([seasonNumber, episodes]) => {
                                  const seasonKey = `${group.key}-s${seasonNumber || '0'}`
                                  const seasonOpen = !!openTvSeasons[seasonKey]
                                  const label = seasonNumber ? `Season ${seasonNumber}` : 'Season ?'
                                  return (
                                    <Fragment key={seasonKey}>
                                      <tr className="border-b border-gray-800 bg-gray-900/60">
                                        <td className="py-1.5 pr-4 pl-6">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setOpenTvSeasons((prev) => ({
                                                ...prev,
                                                [seasonKey]: !seasonOpen,
                                              }))
                                            }
                                            className="inline-flex items-center gap-2 text-xs text-gray-300"
                                          >
                                            {seasonOpen ? (
                                              <ChevronDown className="w-3 h-3" />
                                            ) : (
                                              <ChevronRight className="w-3 h-3" />
                                            )}
                                            <span>{label}</span>
                                          </button>
                                        </td>
                                        <td className="py-1.5 pr-4 text-gray-500 text-xs" colSpan={3}>
                                          {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
                                        </td>
                                      </tr>
                                      {seasonOpen &&
                                        episodes.map(({ resource, uploadedVideo }) => {
                                          const slug = resource?.id
                                          const isSaving =
                                            remapItem?._id === uploadedVideo?._id && savingId != null
                                          const isDeleting =
                                            deletingId === slug || deletingId === uploadedVideo?._id
                                          const epTitle =
                                            uploadedVideo?.title ?? uploadedVideo?.filename ?? '—'
                                          return (
                                            <tr
                                              key={slug}
                                              className="border-b border-gray-900 bg-gray-900/40"
                                            >
                                              <td className="py-1.5 pr-4 pl-10 font-mono text-gray-400">
                                                {slug ?? '—'}
                                              </td>
                                              <td
                                                className="py-1.5 pr-4 text-gray-200 truncate max-w-[260px]"
                                                title={epTitle}
                                              >
                                                S{uploadedVideo?.seasonNumber ?? '?'}E
                                                {uploadedVideo?.episodeNumber ?? '?'} · {epTitle}
                                              </td>
                                              <td className="py-1.5 pr-4 text-gray-400">
                                                {uploadedVideo?.externalId != null
                                                  ? uploadedVideo.externalId
                                                  : '—'}
                                              </td>
                                              <td className="py-1.5 pr-4">
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => setResourceInfoNode(resource)}
                                                    className="p-1.5 rounded-lg border border-gray-500/60 text-gray-400 hover:bg-gray-600/50 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Info / Settings"
                                                  >
                                                    <Settings className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => setRemapItem(uploadedVideo)}
                                                    disabled={isSaving || isDeleting}
                                                    className="p-1.5 rounded-lg bg-amber-500 text-gray-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Remap"
                                                  >
                                                    <Pencil className="w-4 h-4" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setDeleteConfirm({
                                                        type: 'resource',
                                                        slug,
                                                        label: epTitle || slug,
                                                      })
                                                    }
                                                    disabled={isSaving || isDeleting}
                                                    className="p-1.5 rounded-lg border border-red-500/60 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Delete"
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          )
                                        })}
                                    </Fragment>
                                  )
                                })}
                            </Fragment>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <h4 className="text-gray-300 text-sm font-medium mt-6 mb-2">Unmapped ({unmapped.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-600 text-gray-400">
                        <th className="py-2 pr-4">Slug / ID</th>
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">TMDB ID</th>
                        <th className="py-2 pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmapped.length === 0 ? (
                        <tr><td colSpan={4} className="py-4 text-gray-500">No unmapped items</td></tr>
                      ) : (
                        unmapped.map(({ resource }) => {
                          const slug = resource?.id
                          const title = resource?.name ?? resource?.title ?? '—'
                          const isSaving = !remapItem?._id && remapItem?.abyssSlug === slug && savingId != null
                          const isDeleting = deletingId === slug
                          return (
                            <tr key={slug} className="border-b border-gray-700">
                              <td className="py-2 pr-4 font-mono text-gray-300">{slug ?? '—'}</td>
                              <td className="py-2 pr-4 text-gray-200 truncate max-w-[200px]" title={title}>{title}</td>
                              <td className="py-2 pr-4 text-gray-500">—</td>
                              <td className="py-2 pr-4">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setResourceInfoNode(resource)}
                                    className="p-1.5 rounded-lg border border-gray-500/60 text-gray-400 hover:bg-gray-600/50 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Info / Settings"
                                  >
                                    <Settings className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRemapItem({ abyssSlug: slug, title: resource?.name ?? '', externalId: null, poster_path: null })}
                                    disabled={isSaving || isDeleting}
                                    className="p-1.5 rounded-lg bg-amber-500 text-gray-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Remap"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirm({ type: 'resource', slug, label: title })}
                                    disabled={isSaving || isDeleting}
                                    className="p-1.5 rounded-lg border border-red-500/60 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {resourcesTotal > RESOURCES_PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-500 text-sm">
                      {(resourcesPage - 1) * RESOURCES_PAGE_SIZE + 1}–
                      {Math.min(resourcesPage * RESOURCES_PAGE_SIZE, resourcesTotal)} of {resourcesTotal}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(1, resourcesPage - 1)
                          setResourcesPage(next)
                          fetchResources(next)
                        }}
                        disabled={resourcesLoading || resourcesPage <= 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = resourcesPage + 1
                          if ((next - 1) * RESOURCES_PAGE_SIZE >= resourcesTotal) return
                          setResourcesPage(next)
                          fetchResources(next)
                        }}
                        disabled={resourcesLoading || resourcesPage * RESOURCES_PAGE_SIZE >= resourcesTotal}
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
        </div>
      )}

      <Modal
        open={resourceInfoNode != null}
        onClose={() => setResourceInfoNode(null)}
        title="Resource info"
      >
        {resourceInfoNode && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-gray-300">
              <dt className="text-gray-500">isDir</dt>
              <dd className="font-mono">{String(resourceInfoNode.isDir ?? '—')}</dd>
              <dt className="text-gray-500">id</dt>
              <dd className="font-mono break-all">{resourceInfoNode.id ?? '—'}</dd>
              <dt className="text-gray-500">name</dt>
              <dd className="font-mono break-all">{resourceInfoNode.name ?? '—'}</dd>
              <dt className="text-gray-500">size</dt>
              <dd className="font-mono">{resourceInfoNode.size != null ? resourceInfoNode.size.toLocaleString() : '—'}</dd>
              <dt className="text-gray-500">status</dt>
              <dd className="font-mono">{resourceInfoNode.status ?? '—'}</dd>
              <dt className="text-gray-500">resolutions</dt>
              <dd>
                {Array.isArray(resourceInfoNode.resolutions) && resourceInfoNode.resolutions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {resourceInfoNode.resolutions.map((r) => (
                      <span
                        key={r}
                        className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-600/80 text-gray-200 border border-gray-500/50"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="font-mono text-gray-500">—</span>
                )}
              </dd>
              <dt className="text-gray-500">createdAt</dt>
              <dd className="font-mono">{resourceInfoNode.createdAt ?? '—'}</dd>
              <dt className="text-gray-500">updatedAt</dt>
              <dd className="font-mono">{resourceInfoNode.updatedAt ?? '—'}</dd>
            </dl>
            <div className="pt-3 border-t border-gray-600">
              <p className="text-gray-400 font-medium mb-2">Rename</p>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={renameInputValue}
                  onChange={(e) => setRenameInputValue(e.target.value)}
                  placeholder="File name"
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleRenameResource}
                  disabled={renaming || !renameInputValue.trim() || renameInputValue.trim() === (resourceInfoNode.name ?? '')}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renaming ? 'Renaming…' : 'Rename'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={deleteConfirm != null}
        onClose={() => !deletingId && setDeleteConfirm(null)}
        title="Delete from Abyss?"
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <p className="text-gray-300">
              Delete <strong className="text-gray-200">{deleteConfirm.type === 'remapping' ? (deleteConfirm.item?.title || deleteConfirm.item?.filename || deleteConfirm.item?.abyssSlug) : deleteConfirm.label}</strong> from Abyss and the database? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingId}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deletingId}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>

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
            onMovieSelect={(m) => {
              setRemapSelectedMovie(m)
              if (!m || m.mediaType !== 'tv') {
                setRemapSeason('')
                setRemapEpisode('')
              }
            }}
            renderActions={(movie) => (
              <button
                type="button"
                onClick={() => confirmRemap(movie)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <Pencil className="w-4 h-4" />
                Remap
              </button>
            )}
          />
          {remapSelectedMovie?.mediaType === 'tv' && (
            <div className="space-y-2">
              <p className="text-gray-300 text-sm font-medium">TV episode details</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Season</label>
                  <input
                    type="number"
                    min={1}
                    value={remapSeason}
                    onChange={(e) => setRemapSeason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    placeholder="1"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Episode</label>
                  <input
                    type="number"
                    min={1}
                    value={remapEpisode}
                    onChange={(e) => setRemapEpisode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    placeholder="1"
                  />
                </div>
              </div>
              <p className="text-gray-500 text-xs">
                Season and episode are required when remapping to a TV / series.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default MappingTab

