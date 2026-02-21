import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import ReCAPTCHA from 'react-google-recaptcha'
import Modal from './Modal'
import SearchMovieForm from './forms/SearchMovieForm'
import SearchableDropdown from './SearchableDropdown'
import apiHelper from '../helper/apiHelper'

const TABS = [
  { id: 'add', label: 'Add movie' },
  { id: 'list', label: 'Queue list' },
]

const PAGE_SIZE = 20

// value = API param; label = display only
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'ad_free', label: 'Available ad-free' },
  { value: 'pending', label: 'Pending' },
  { value: 'downloading', label: 'Downloading' },
  { value: 'staging', label: 'Staging' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
]

function statusBadgeClass(status) {
  if (status === 'ad_free') return 'bg-green-500/20 text-green-400 border-green-500/40'
  if (status === 'processing') return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
  if (status === 'staging') return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
  if (status === 'failed') return 'bg-red-500/20 text-red-400 border-red-500/40'
  return 'bg-gray-500/20 text-gray-400 border-gray-500/40'
}

export default function AddAdFreeMovieModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState('add')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [adding, setAdding] = useState(false)
  const [queueList, setQueueList] = useState([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueSkip, setQueueSkip] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('')
  const recaptchaRef = useRef(null)

  const needsRecaptcha = Boolean(recaptchaSiteKey)

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true)
    try {
      const params = { limit: PAGE_SIZE, skip: queueSkip }
      if (statusFilter) params.status = statusFilter
      const { data } = await apiHelper.get('/api/feedback/ad-free-request', { params })
      if (data?.success && data?.data) {
        setQueueList(data.data.list ?? [])
        setQueueTotal(data.data.total ?? 0)
      }
    } catch {
      setQueueList([])
      setQueueTotal(0)
    } finally {
      setQueueLoading(false)
    }
  }, [queueSkip, statusFilter])

  useEffect(() => {
    setQueueSkip(0)
  }, [statusFilter])

  useEffect(() => {
    if (open && activeTab === 'list') fetchQueue()
  }, [open, activeTab, fetchQueue])

  useEffect(() => {
    if (open) {
      apiHelper.get('/auth/recaptcha-site-key')
        .then(({ data }) => setRecaptchaSiteKey(data?.data?.siteKey || ''))
        .catch(() => setRecaptchaSiteKey(''))
    }
  }, [open])

  useEffect(() => {
    console.log(recaptchaSiteKey)
  }, [recaptchaSiteKey])

  const handleAddToQueue = async () => {
    const movie = selectedMovie
    if (!movie?.title && !movie?.id) {
      toast.error('Search and select a movie first')
      return
    }
    if (needsRecaptcha && !recaptchaRef.current?.getValue?.()) {
      toast.error('Please complete the captcha verification')
      return
    }
    setAdding(true)
    try {
      const payload = movie.id != null
        ? { tmdbId: movie.id }
        : movie.imdb_id
          ? { imdbId: movie.imdb_id }
          : null
      if (!payload) {
        toast.error('Movie has no TMDB or IMDB id')
        setAdding(false)
        return
      }
      if (needsRecaptcha) {
        payload.recaptchaToken = recaptchaRef.current.getValue()
      }
      await apiHelper.post('/api/feedback/ad-free-request', payload)
      toast.success('Added to download queue. It will be processed and become ad-free for everyone.')
      setSelectedMovie(null)
      recaptchaRef.current?.reset?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add to queue')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add ad-free movie" backdropClassName="bg-black/30">
      <div className="space-y-6">
        <div className="flex gap-1 border-b border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab(tab.id)
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'add' && (
          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
            <p className="text-gray-400 text-sm mb-4">
              Search for a movie by IMDB or TMDB ID, then add it to the download queue. Once processed, it will be available ad-free for everyone.
            </p>
            {needsRecaptcha && (
                    <div className="mb-4 [&_.grecaptcha-badge]:bottom-14!">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={recaptchaSiteKey}
                        theme="dark"
                        size="normal"
                      />
                    </div>
                  )}

            <SearchMovieForm
              placeholder="IMDB (tt0137523) or TMDB (550)"
              description={null}
              onMovieSelect={setSelectedMovie}
              renderActions={() => (
                <>
                  <button
                    type="button"
                    disabled={adding}
                    onClick={handleAddToQueue}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adding ? 'Adding…' : 'Add to queue'}
                  </button>
                </>
              )}
            />

          </div>
        )}

        {activeTab === 'list' && (
          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-gray-200 font-medium">Queue list</h3>
              <div className="w-44">
                <SearchableDropdown
                  options={STATUS_FILTER_OPTIONS}
                  valueKey="value"
                  labelKey="label"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="All"
                />
              </div>
            </div>
            {queueLoading ? (
              <p className="text-gray-500 text-sm">Loading…</p>
            ) : queueList.length === 0 ? (
              <p className="text-gray-500 text-sm">No items in queue. Add a movie in the Add tab.</p>
            ) : (
              <>
                <ul className="space-y-3 max-h-80 overflow-y-auto">
                  {queueList.map((item) => (
                    <li
                      key={item._id}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-800/80 border border-gray-700"
                    >
                      <div className="w-12 h-[72px] shrink-0 rounded overflow-hidden bg-gray-700">
                        {item.poster_url ? (
                          <img src={item.poster_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No poster</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-200 text-sm font-medium truncate">{item.title}</p>
                        {item.year != null && (
                          <p className="text-gray-500 text-xs">{item.year}</p>
                        )}
                        {item.downloadStatus && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${statusBadgeClass(item.downloadStatus)}`}>
                            {item.downloadStatus}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {queueTotal > PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-500 text-sm">
                      {queueSkip + 1}–{Math.min(queueSkip + PAGE_SIZE, queueTotal)} of {queueTotal}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setQueueSkip((s) => Math.max(0, s - PAGE_SIZE))}
                        disabled={queueSkip === 0}
                        className="px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueueSkip((s) => s + PAGE_SIZE)}
                        disabled={queueSkip + PAGE_SIZE >= queueTotal}
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
      </div>
    </Modal>
  )
}
