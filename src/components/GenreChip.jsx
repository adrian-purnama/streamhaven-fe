import React from 'react'
import { Link } from 'react-router-dom'

/** Deterministic hash from string for consistent color per genre name */
function hashString(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** Palette of distinct chip backgrounds (readable with white text) */
const GENRE_COLORS = [
  'bg-rose-600',
  'bg-amber-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-violet-600',
  'bg-fuchsia-600',
  'bg-cyan-600',
  'bg-orange-600',
  'bg-lime-600',
  'bg-indigo-600',
  'bg-pink-600',
  'bg-teal-600',
]

/**
 * Chip that shows a genre name with a consistent background color per name.
 * When genreId (or id) is provided, clicking navigates to Discover with that genre selected.
 * @param {string} [name] - Genre name (e.g. "Action", "Drama")
 * @param {string} [genre] - Genre name (alias for name)
 * @param {string|number} [genreId] - TMDB genre id; when set, chip links to /discover with this genre active
 * @param {string|number} [id] - Alias for genreId (e.g. from media.genres[].id)
 * @param {string} [mediaType] - 'movie' | 'tv' for discover link; default 'movie'
 * @param {string} [className] - Optional extra classes
 */
const GenreChip = ({ name, genre, genreId, id, mediaType = 'movie', className = '' }) => {
  const displayName = genre ?? name
  if (!displayName) return null
  const index = hashString(displayName) % GENRE_COLORS.length
  const bgClass = GENRE_COLORS[index]
  const linkGenreId = genreId != null ? String(genreId) : (id != null ? String(id) : null)
  const discoverTo = linkGenreId
    ? `/discover?type=${mediaType === 'tv' ? 'tv' : 'movie'}&with_genres=${linkGenreId}`
    : null

  const baseClass = `inline-block px-2.5 py-1 rounded-md text-xs font-medium text-white hover:opacity-80 ${bgClass} ${className}`

  if (discoverTo) {
    return (
      <Link to={discoverTo} className={`cursor-pointer ${baseClass}`}>
        {displayName}
      </Link>
    )
  }
  return <span className={`cursor-default ${baseClass}`}>{displayName}</span>
}

export default GenreChip
