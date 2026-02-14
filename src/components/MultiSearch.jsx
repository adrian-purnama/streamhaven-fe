import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiHelper from '../helper/apiHelper'

const DEBOUNCE_MS = 700

function MultiSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const fetchSearch = useCallback(async (q) => {
    const trimmed = (q || '').trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await apiHelper.post(
        `/api/movies/search/${encodeURIComponent(trimmed)}/false/1`
      )
      const data = res.data?.data ?? []
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }
    setOpen(true)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      fetchSearch(query)
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchSearch])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getItemImage = (item) => {
    if (item.media_type === 'person') return item.profile_url
    return item.poster_url
  }

  const getItemTitle = (item) => {
    if (item.media_type === 'person') return item.name ?? item.original_name
    return item.title ?? item.name ?? ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/search')
    }
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="flex-1 min-w-0 w-full relative">
      <form
        onSubmit={handleSubmit}
        className="flex items-stretch rounded-lg bg-gray-700/80 border border-gray-600 overflow-hidden focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 px-2 py-2"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Search movies, TV, people…"
          className="flex-1 bg-transparent px-3 text-sm text-gray-100 placeholder-gray-400 focus:outline-none"
          aria-label="Search"
          aria-expanded={open}
          aria-autocomplete="list"
        />

        <button
          className="px-3 border-l border-gray-600/70 text-sm font-medium text-gray-300 cursor-pointer hover:text-amber-400 transition-colors focus:outline-none"
        >
          Search
        </button>
      </form>

      {open && (query.trim() || results.length > 0 || loading) && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-600 bg-gray-800 shadow-xl z-50 max-h-[min(70vh,400px)] overflow-y-auto overflow-x-hidden py-1 pr-2 -mr-2 [scrollbar-width:thin] [scrollbar-color:var(--color-gray-600)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:min-h-8"
          role="listbox"
        >
          {loading && (
            <div className="px-3 py-4 text-center text-gray-400 text-sm">
              Searching…
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              No results
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul className="py-1">
              {results.map((item) => {
                const title = getItemTitle(item)
                const img = getItemImage(item)
                const href =
                  item.media_type === 'movie'
                    ? `/watch/movie/${item.id}`
                    : item.media_type === 'tv'
                      ? `/watch/tv/${item.id}/1/1`
                      : null

                return (
                  <li key={`${item.media_type}-${item.id}`} role="option">
                    {href ? (
                      <Link
                        to={href}
                        onClick={() => {
                          setOpen(false)
                          setQuery('')
                        }}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-700/80 transition-colors"
                      >
                        <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-gray-700">
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-100 text-sm font-medium truncate">
                            {title}
                          </p>
                          <p className="text-gray-500 text-xs capitalize">
                            {item.media_type}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-2 text-gray-300">
                        <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-gray-700">
                          {img ? (
                            <img
                              src={img}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-100 text-sm font-medium truncate">
                            {title}
                          </p>
                          <p className="text-gray-500 text-xs capitalize">
                            {item.media_type}
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default MultiSearch
