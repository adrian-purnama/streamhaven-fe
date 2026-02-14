import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiHelper from '../helper/apiHelper'
import Poster from '../components/Poster'
import PosterGrid from '../components/PosterGrid'
import SearchableDropdown from '../components/SearchableDropdown'

const SORT_OPTIONS_MOVIE = [
  { value: '', label: 'Default' },
  { value: 'popularity.desc', label: 'Popularity desc' },
  { value: 'popularity.asc', label: 'Popularity asc' },
  { value: 'vote_average.desc', label: 'Vote average desc' },
  { value: 'vote_average.asc', label: 'Vote average asc' },
  { value: 'primary_release_date.desc', label: 'Release date desc' },
  { value: 'primary_release_date.asc', label: 'Release date asc' },
  { value: 'revenue.desc', label: 'Revenue desc' },
  { value: 'vote_count.desc', label: 'Vote count desc' },
]
const SORT_OPTIONS_TV = [
  { value: '', label: 'Default' },
  { value: 'popularity.desc', label: 'Popularity desc' },
  { value: 'vote_average.desc', label: 'Vote average desc' },
  { value: 'first_air_date.desc', label: 'First air date desc' },
  { value: 'first_air_date.asc', label: 'First air date asc' },
]

const RESULTS_PER_PAGE = 20

function parseDiscoverSearchParams(searchParams) {
  const get = (k) => searchParams.get(k) ?? ''
  const type = (searchParams.get('type') || 'movie').toLowerCase()
  const validType = type === 'tv' ? 'tv' : 'movie'
  const withGenres = searchParams.get('with_genres') || ''
  return {
    type: validType,
    params: {
      sort_by: get('sort_by') || 'popularity.desc',
      page: get('page') || '1',
      language: get('language') || 'en-US',
      primary_release_year: get('primary_release_year'),
      first_air_date_year: get('first_air_date_year'),
      'vote_average.gte': get('vote_average.gte'),
      'vote_average.lte': get('vote_average.lte'),
      'vote_count.gte': get('vote_count.gte'),
      'vote_count.lte': get('vote_count.lte'),
      include_adult: searchParams.get('include_adult') === 'true',
    },
    selectedGenreIds: withGenres ? withGenres.split(',').map((s) => s.trim()).filter(Boolean) : [],
  }
}

function discoverStateToSearchParams(type, params, selectedGenreIds) {
  const p = new URLSearchParams()
  p.set('type', type)
  p.set('sort_by', params.sort_by || 'popularity.desc')
  p.set('page', String(params.page || '1'))
  if (params.language) p.set('language', params.language)
  if (params.primary_release_year) p.set('primary_release_year', params.primary_release_year)
  if (params.first_air_date_year) p.set('first_air_date_year', params.first_air_date_year)
  if (params['vote_average.gte']) p.set('vote_average.gte', params['vote_average.gte'])
  if (params['vote_average.lte']) p.set('vote_average.lte', params['vote_average.lte'])
  if (params['vote_count.gte']) p.set('vote_count.gte', params['vote_count.gte'])
  if (params['vote_count.lte']) p.set('vote_count.lte', params['vote_count.lte'])
  if (params.include_adult === true || params.include_adult === 'true') p.set('include_adult', 'true')
  if (selectedGenreIds.length > 0) p.set('with_genres', selectedGenreIds.join(','))
  return p
}

const inputClass =
  'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors'
const labelClass = 'block text-gray-400 text-sm font-medium mb-1.5'

const defaultParams = {
  sort_by: 'popularity.desc',
  page: '1',
  language: 'en-US',
  primary_release_year: '',
  first_air_date_year: '',
  'vote_average.gte': '',
  'vote_average.lte': '',
  'vote_count.gte': '',
  'vote_count.lte': '',
  include_adult: false,
}

export default function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [type, setType] = useState('movie')
  const [genres, setGenres] = useState([])
  const [languages, setLanguages] = useState([])
  const [selectedGenreIds, setSelectedGenreIds] = useState([])
  const [params, setParams] = useState(defaultParams)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [totalResults, setTotalResults] = useState(0)
  const [initializedFromUrl, setInitializedFromUrl] = useState(false)
  const didRunInitialDiscover = useRef(false)
  const [filtersOpen, setFiltersOpen] = useState(true)

  useEffect(() => {
    const parsed = parseDiscoverSearchParams(searchParams)
    const timer = setTimeout(() => {
      setType(parsed.type)
      setParams(parsed.params)
      setSelectedGenreIds(parsed.selectedGenreIds)
      setInitializedFromUrl(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    apiHelper
      .get('/api/genres', { params: { genreType: type } })
      .then((res) => {
        if (cancelled) return
        setGenres(Array.isArray(res.data?.data) ? res.data.data : [])
      })
      .catch(() => { if (!cancelled) setGenres([]) })
    return () => { cancelled = true }
  }, [type])

  useEffect(() => {
    apiHelper
      .get('/api/languages')
      .then((res) => setLanguages(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setLanguages([]))
  }, [])

  const languageOptions = useMemo(() => {
    const base = [
      { iso_639_1: '', english_name: 'Any' },
      { iso_639_1: 'en-US', english_name: 'English (US)' },
    ]
    const fromApi = (languages || []).filter((l) => l.iso_639_1 && l.iso_639_1 !== 'en')
    return [...base, ...fromApi]
  }, [languages])

  const toggleGenre = (externalSystemId) => {
    const idStr = String(externalSystemId)
    setSelectedGenreIds((prev) =>
      prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : [...prev, idStr]
    )
  }

  const runDiscover = useCallback(
    (pageOverride) => {
      const page = pageOverride != null ? String(pageOverride) : (params.page || '1')
      const nextParams = { ...params, page }
      const q = { ...nextParams }
      if (selectedGenreIds.length > 0) q.with_genres = selectedGenreIds.join(',')
      Object.keys(q).forEach((k) => {
        const v = q[k]
        if (v === true) q[k] = 'true'
        else if (v === false) q[k] = 'false'
        else if (v == null || String(v).trim() === '') delete q[k]
        else q[k] = String(v).trim()
      })
      setSearchParams(discoverStateToSearchParams(type, nextParams, selectedGenreIds))
      setParams((prev) => ({ ...prev, page }))
      setLoading(true)
      setError(null)
      apiHelper
        .get(`/api/discover/${type}`, { params: q })
        .then((res) => {
          const data = res.data?.data ?? {}
          setResults(Array.isArray(data.results) ? data.results : [])
          setTotalPages(data.total_pages ?? 0)
          setTotalResults(data.total_results ?? 0)
        })
        .catch((err) => {
          setError(err.response?.data?.message || err.message || 'Discover failed')
          setResults([])
          setTotalPages(0)
          setTotalResults(0)
        })
        .finally(() => setLoading(false))
    },
    [type, params, selectedGenreIds, setSearchParams]
  )

  useEffect(() => {
    if (!initializedFromUrl || didRunInitialDiscover.current) return
    didRunInitialDiscover.current = true
    const page = params.page || '1'
    const q = { ...params, page }
    if (selectedGenreIds.length > 0) q.with_genres = selectedGenreIds.join(',')
    Object.keys(q).forEach((k) => {
      const v = q[k]
      if (v === true) q[k] = 'true'
      else if (v === false) q[k] = 'false'
      else if (v == null || String(v).trim() === '') delete q[k]
      else q[k] = String(v).trim()
    })
    queueMicrotask(() => {
      setSearchParams(discoverStateToSearchParams(type, { ...params, page }, selectedGenreIds))
      setLoading(true)
      setError(null)
    })
    apiHelper
      .get(`/api/discover/${type}`, { params: q })
      .then((res) => {
        const data = res.data?.data ?? {}
        setResults(Array.isArray(data.results) ? data.results : [])
        setTotalPages(data.total_pages ?? 0)
        setTotalResults(data.total_results ?? 0)
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Discover failed')
        setResults([])
        setTotalPages(0)
        setTotalResults(0)
      })
      .finally(() => setLoading(false))
  }, [initializedFromUrl, type, params, selectedGenreIds, setSearchParams])

  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  const setPage = (newPage) => {
    const p = Math.max(1, Math.min(totalPages || 1, newPage))
    updateParam('page', String(p))
    runDiscover(p)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [params.page])

  const hasUnappliedChanges = useMemo(() => {
    if (!initializedFromUrl) return false
    const appliedState = parseDiscoverSearchParams(searchParams)
    if (appliedState.type !== type) return true

    const keysToCompare = [
      'sort_by',
      'language',
      'primary_release_year',
      'first_air_date_year',
      'vote_average.gte',
      'vote_average.lte',
      'vote_count.gte',
      'vote_count.lte',
    ]

    for (const key of keysToCompare) {
      const appliedVal = appliedState.params[key] ?? ''
      const currentVal = params[key] ?? ''
      if (String(appliedVal) !== String(currentVal)) return true
    }

    const appliedAdult =
      appliedState.params.include_adult === true || appliedState.params.include_adult === 'true'
    const currentAdult = params.include_adult === true || params.include_adult === 'true'
    if (appliedAdult !== currentAdult) return true

    const appliedGenres = (appliedState.selectedGenreIds || []).map(String).sort()
    const currentGenres = (selectedGenreIds || []).map(String).sort()
    if (appliedGenres.length !== currentGenres.length) return true
    for (let i = 0; i < appliedGenres.length; i += 1) {
      if (appliedGenres[i] !== currentGenres[i]) return true
    }

    return false
  }, [initializedFromUrl, searchParams, type, params, selectedGenreIds])

  const sortOptions = type === 'movie' ? SORT_OPTIONS_MOVIE : SORT_OPTIONS_TV
  const yearKey = type === 'movie' ? 'primary_release_year' : 'first_air_date_year'
  const yearLabel = type === 'movie' ? 'Release year' : 'First air year'

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Discover</h1>

      {/* Type toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => { setType('movie'); setSelectedGenreIds([]) }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${type === 'movie' ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:text-white'
            }`}
        >
          Movies
        </button>
        <button
          type="button"
          onClick={() => { setType('tv'); setSelectedGenreIds([]) }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${type === 'tv' ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:text-white'
            }`}
        >
          TV
        </button>
      </div>

      {/* Filter panel (collapsible) */}
      <div className="bg-gray-800/60 rounded-xl p-4 md:p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-100">Filters</span>
            {hasUnappliedChanges && !loading && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/40">
                Changed – press Discover to apply
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="text-xs font-medium text-gray-400 hover:text-amber-400 flex items-center gap-1"
          >
            <span>{filtersOpen ? 'Hide filters' : 'Show filters'}</span>
            <span aria-hidden>{filtersOpen ? '▴' : '▾'}</span>
          </button>
        </div>

        {filtersOpen && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>Sort by</label>
                <SearchableDropdown
                  options={sortOptions}
                  valueKey="value"
                  labelKey="label"
                  value={params.sort_by || 'popularity.desc'}
                  onChange={(val) => updateParam('sort_by', val ?? '')}
                  placeholder="Sort by..."
                />
              </div>
              <div>
                <label className={labelClass}>Language</label>
                <SearchableDropdown
                  options={languageOptions}
                  valueKey="iso_639_1"
                  labelKey="english_name"
                  value={params.language || 'en-US'}
                  onChange={(val) => updateParam('language', val ?? '')}
                  placeholder="Select language..."
                />
              </div>
              <div>
                <label className={labelClass}>{yearLabel}</label>
                <input
                  type="text"
                  placeholder="e.g. 2024"
                  value={type === 'movie' ? params.primary_release_year : params.first_air_date_year || ''}
                  onChange={(e) => updateParam(yearKey, e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Rating ≥ (min)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="e.g. 7"
                  value={params['vote_average.gte'] || ''}
                  onChange={(e) => updateParam('vote_average.gte', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Rating ≤ (max)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="e.g. 9"
                  value={params['vote_average.lte'] || ''}
                  onChange={(e) => updateParam('vote_average.lte', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Votes ≥ (min)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 100"
                  value={params['vote_count.gte'] || ''}
                  onChange={(e) => updateParam('vote_count.gte', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Votes ≤ (max)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="optional"
                  value={params['vote_count.lte'] || ''}
                  onChange={(e) => updateParam('vote_count.lte', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.include_adult === true || params.include_adult === 'true'}
                    onChange={(e) => updateParam('include_adult', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-gray-400 text-sm">Include adult</span>
                </label>
              </div>
            </div>

            {/* Genres as chips */}
            <div>
              <span className={labelClass}>Genres</span>
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => {
                  const id = g.externalSystemId || g._id
                  const active = selectedGenreIds.includes(String(id))
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleGenre(id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-amber-500 text-gray-900'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      {g.name}
                    </button>
                  )
                })}
                {genres.length === 0 && (
                  <span className="text-gray-500 text-sm">No genres loaded. Sync genres in admin.</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => runDiscover()}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading…' : 'Discover'}
              </button>
              {hasUnappliedChanges && !loading && (
                <span className="text-xs text-amber-300">
                  Filters updated – press Discover to refresh results
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {results.length > 0 && (
        <>
          {(() => {
            const currentPage = Math.max(1, parseInt(params.page, 10) || 1)
            const start = (currentPage - 1) * RESULTS_PER_PAGE + 1
            const end = Math.min(currentPage * RESULTS_PER_PAGE, totalResults)
            return (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-400 text-sm mb-4">
                <span>Page {currentPage} of {totalPages || 1}</span>
                <span>Showing {start}–{end} of {totalResults} result{totalResults !== 1 ? 's' : ''}</span>
              </div>
            )
          })()}
          <PosterGrid>
            {results.map((item) => (
              <Poster
                key={item.id}
                movie={{ ...item, externalId: item.id, title: item.title || item.name }}
                size="md"
                mediaType={type}
                className="shrink-0"
              />
            ))}
          </PosterGrid>
          {totalPages > 1 && (
            <div>
              <div className="flex justify-center gap-2 mt-8">
                <button
                  type="button"
                  onClick={() => setPage(parseInt(params.page, 10) - 1)}
                  disabled={parseInt(params.page, 10) <= 1}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(parseInt(params.page, 10) + 1)}
                  disabled={parseInt(params.page, 10) >= totalPages}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  Next
                </button>
              </div>
              {(() => {
                const currentPage = Math.max(1, parseInt(params.page, 10) || 1)
                const start = (currentPage - 1) * RESULTS_PER_PAGE + 1
                const end = Math.min(currentPage * RESULTS_PER_PAGE, totalResults)
                return (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-400 text-sm mb-4 mt-4">
                    <span>Page {currentPage} of {totalPages || 1}</span>
                    <span>Showing {start}–{end} of {totalResults} result{totalResults !== 1 ? 's' : ''}</span>
                  </div>
                )
              })()}
            </div>
          )}
        </>
      )}
    </div>
  )
}
