const STORAGE_KEY_PREFIX = 'lastWatched_tv_'

function episodeKey(season, episode) {
  return `${season}_${episode}`
}

function readStored(showId) {
  if (!showId) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + showId)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Get the last watched season and episode for a TV show (for redirect).
 * @param {string} showId - TMDB show id
 * @returns {{ season: number, episode: number } | null}
 */
export function getLastWatchedEpisode(showId) {
  const stored = readStored(showId)
  if (!stored) return null
  if (stored.last) return stored.last
  if (stored.season != null && stored.episode != null) {
    const season = parseInt(stored.season, 10)
    const episode = parseInt(stored.episode, 10)
    if (!Number.isNaN(season) && !Number.isNaN(episode) && season >= 0 && episode >= 1) {
      return { season, episode }
    }
  }
  return null
}

/**
 * Save the current season and episode; also add this episode to the visited set.
 * @param {string} showId - TMDB show id
 * @param {number} season - season number
 * @param {number} episode - episode number
 */
export function setLastWatchedEpisode(showId, season, episode) {
  if (!showId) return
  const s = Math.max(0, parseInt(season, 10) || 0)
  const e = Math.max(1, parseInt(episode, 10) || 1)
  try {
    const stored = readStored(showId) || {}
    let visited = Array.isArray(stored.visited) ? stored.visited : []
    const key = episodeKey(s, e)
    if (!visited.includes(key)) visited = [...visited, key]
    localStorage.setItem(
      STORAGE_KEY_PREFIX + showId,
      JSON.stringify({ last: { season: s, episode: e }, visited })
    )
  } catch {
    // ignore quota or disabled localStorage
  }
}

/**
 * If user is on the default first episode (1/1) and we have a different last-watched episode,
 * return the path to jump to; otherwise null.
 */
export function getRedirectToLastWatched(showId, currentSeason, currentEpisode) {
  if (!showId || currentSeason !== 1 || currentEpisode !== 1) return null
  const last = getLastWatchedEpisode(showId)
  if (!last || (last.season === 1 && last.episode === 1)) return null
  return `/watch/tv/${showId}/${last.season}/${last.episode}`
}

/**
 * True if this exact episode has been visited (opened) before.
 * @param {string} showId - TMDB show id
 * @param {number} season - season number
 * @param {number} episode - episode number
 * @returns {boolean}
 */
export function isEpisodeWatched(showId, season, episode) {
  const stored = readStored(showId)
  if (!stored) return false
  const visited = Array.isArray(stored.visited) ? stored.visited : []
  return visited.includes(episodeKey(season, episode))
}
