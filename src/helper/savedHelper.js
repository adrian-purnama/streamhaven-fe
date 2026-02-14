/**
 * Guest saved lists (localStorage): max 3 folders, 5 items per folder.
 * When user registers/logs in, call migrateGuestSavedToAccount(apiHelper) to move data to their account.
 */

const STORAGE_KEY = 'fc-saved'
const GUEST_MAX_FOLDERS = 3
const GUEST_MAX_SAVED_PER_FOLDER = 5

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { folders: [] }
    const data = JSON.parse(raw)
    return Array.isArray(data.folders) ? data : { folders: [] }
  } catch {
    return { folders: [] }
  }
}

function write(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[savedHelper] localStorage setItem failed', e)
  }
}

/**
 * @returns {{ folders: Array<{ id: string, name: string, saved: Array<SavedItem> }> }}
 */
export function getGuestSaved() {
  const data = read()
  return {
    folders: (data.folders || []).map((f) => ({
      id: f.id || genId(),
      name: f.name || 'Folder',
      saved: (f.saved || []).map((s) => ({
        id: s.id || genId(),
        externalId: s.externalId,
        mediaType: s.mediaType || 'movie',
        title: s.title || '',
        poster_url: typeof s.poster_url === 'string' ? s.poster_url : '',
        category: s.category || '',
        vote_average: s.vote_average ?? 0,
        release_date: s.release_date || '',
        genre_ids: Array.isArray(s.genre_ids) ? s.genre_ids : [],
        overview: s.overview || '',
        episode_group: s.episode_group || { episode_count: 0, group_count: 0 },
      })),
    })),
  }
}

export function getGuestFolders() {
  return getGuestSaved().folders
}

/**
 * Create a folder. Throws if already at GUEST_MAX_FOLDERS.
 * @param {string} name
 * @returns {{ id: string, name: string, saved: [] }}
 */
export function createGuestFolder(name) {
  const data = read()
  const folders = data.folders || []
  if (folders.length >= GUEST_MAX_FOLDERS) {
    throw new Error(`Maximum ${GUEST_MAX_FOLDERS} folders for guests`)
  }
  const trimmed = typeof name === 'string' ? name.trim() : 'New folder'
  const folder = { id: genId(), name: trimmed || 'New folder', saved: [] }
  folders.push(folder)
  write({ folders })
  return folder
}

/**
 * Add item to a folder. Throws if folder has GUEST_MAX_SAVED_PER_FOLDER items.
 * @param {string} folderId
 * @param {{ externalId: number, mediaType: 'movie'|'tv', title: string, category?: string, vote_average?: number, release_date?: string, genre_ids?: number[], overview?: string, episode_group?: { episode_count?: number, group_count?: number } }} item
 * @returns the added saved item with id
 */
export function addGuestSavedItem(folderId, item) {
  const data = read()
  const folders = data.folders || []
  const folder = folders.find((f) => f.id === folderId)
  if (!folder) throw new Error('Folder not found')
  if ((folder.saved || []).length >= GUEST_MAX_SAVED_PER_FOLDER) {
    throw new Error(`Maximum ${GUEST_MAX_SAVED_PER_FOLDER} items per folder for guests`)
  }
  const savedItem = {
    id: genId(),
    externalId: Number(item.externalId),
    mediaType: item.mediaType === 'tv' ? 'tv' : 'movie',
    title: typeof item.title === 'string' ? item.title.trim() : String(item.title || ''),
    poster_url: typeof item.poster_url === 'string' ? item.poster_url : '',
    category: typeof item.category === 'string' ? item.category : '',
    vote_average: Number(item.vote_average) || 0,
    release_date: typeof item.release_date === 'string' ? item.release_date : '',
    genre_ids: Array.isArray(item.genre_ids) ? item.genre_ids : [],
    overview: typeof item.overview === 'string' ? item.overview : '',
    episode_group: item.episode_group && typeof item.episode_group === 'object'
      ? { episode_count: Number(item.episode_group.episode_count) || 0, group_count: Number(item.episode_group.group_count) || 0 }
      : { episode_count: 0, group_count: 0 },
  }
  folder.saved = folder.saved || []
  folder.saved.push(savedItem)
  write({ folders })
  return savedItem
}

/**
 * Remove a saved item from a folder.
 */
export function removeGuestSavedItem(folderId, savedItemId) {
  const data = read()
  const folders = data.folders || []
  const folder = folders.find((f) => f.id === folderId)
  if (!folder) throw new Error('Folder not found')
  folder.saved = (folder.saved || []).filter((s) => s.id !== savedItemId)
  write({ folders })
}

/**
 * Delete a folder.
 */
export function deleteGuestFolder(folderId) {
  const data = read()
  const folders = (data.folders || []).filter((f) => f.id !== folderId)
  write({ folders })
}

/**
 * Update folder name.
 */
export function updateGuestFolder(folderId, { name }) {
  const data = read()
  const folders = data.folders || []
  const folder = folders.find((f) => f.id === folderId)
  if (!folder) throw new Error('Folder not found')
  if (name !== undefined) folder.name = typeof name === 'string' ? name.trim() : folder.name
  write({ folders })
  return folder
}

/**
 * Check if a show is saved in any guest folder (by externalId + mediaType).
 * @returns { string | null } folderId if found, else null
 */
export function getGuestFolderContaining(externalId, mediaType) {
  const { folders } = getGuestSaved()
  const id = Number(externalId)
  const type = mediaType === 'tv' ? 'tv' : 'movie'
  for (const f of folders) {
    const has = (f.saved || []).some((s) => s.externalId === id && s.mediaType === type)
    if (has) return f.id
  }
  return null
}

/**
 * Migrate guest localStorage saved data to the user's account (after login/register).
 * Creates folders via API then adds each saved item. Clears localStorage on success.
 * @param { import('../helper/apiHelper').default } apiHelper - axios instance with auth
 * @returns { Promise<{ migrated: number, foldersCreated: number }> }
 */
export async function migrateGuestSavedToAccount(apiHelper) {
  const { folders } = getGuestSaved()
  if (!folders.length) return { migrated: 0, foldersCreated: 0 }

  const folderIdMap = {} // guest folder id -> server folder _id
  let foldersCreated = 0
  let migrated = 0

  for (const folder of folders) {
    try {
      const { data } = await apiHelper.post('/api/users/me/folders', {
        name: folder.name,
        description: '',
      })
      const serverId = data?.data?._id
      if (!serverId) continue
      folderIdMap[folder.id] = serverId
      foldersCreated++
    } catch (e) {
      console.warn('[savedHelper] Failed to create folder on server', folder.name, e)
      continue
    }
  }

  for (const folder of folders) {
    const serverFolderId = folderIdMap[folder.id]
    if (!serverFolderId || !(folder.saved || []).length) continue
    for (const item of folder.saved) {
      try {
        await apiHelper.post(`/api/users/me/folders/${serverFolderId}/saved`, {
          externalId: item.externalId,
          mediaType: item.mediaType,
          title: item.title,
          poster_url: item.poster_url,
          category: item.category,
          vote_average: item.vote_average,
          release_date: item.release_date,
          genre_ids: item.genre_ids,
          overview: item.overview,
          episode_group: item.episode_group,
        })
        migrated++
      } catch (e) {
        console.warn('[savedHelper] Failed to add item to server', item.title, e)
      }
    }
  }

  write({ folders: [] })
  return { migrated, foldersCreated }
}

/**
 * Migrate only selected guest folders and selected items to the user's account.
 * @param { import('../helper/apiHelper').default } apiHelper - axios instance with auth
 * @param {{ folderIds: string[], itemsByFolder: Record<string, string[]> }} options
 *   - folderIds: guest folder ids to import
 *   - itemsByFolder: for each folder id, array of saved item ids to import (if missing/empty, all items in that folder)
 * @returns { Promise<{ migrated: number, foldersCreated: number }> }
 */
export async function migrateGuestSavedToAccountCustom(apiHelper, { folderIds, itemsByFolder }) {
  const { folders } = getGuestSaved()
  const folderIdSet = new Set(folderIds || [])
  const toMigrate = folders.filter((f) => folderIdSet.has(f.id))
  if (!toMigrate.length) return { migrated: 0, foldersCreated: 0 }

  const folderIdMap = {}
  let foldersCreated = 0
  let migrated = 0

  for (const folder of toMigrate) {
    try {
      const { data } = await apiHelper.post('/api/users/me/folders', {
        name: folder.name,
        description: '',
      })
      const serverId = data?.data?._id
      if (!serverId) continue
      folderIdMap[folder.id] = serverId
      foldersCreated++
    } catch (e) {
      console.warn('[savedHelper] Failed to create folder on server', folder.name, e)
    }
  }

  const selectedByFolder = itemsByFolder || {}
  for (const folder of toMigrate) {
    const serverFolderId = folderIdMap[folder.id]
    if (!serverFolderId) continue
    const allowedIds = selectedByFolder[folder.id]
    const itemIdSet = Array.isArray(allowedIds) && allowedIds.length > 0 ? new Set(allowedIds) : null
    const items = (folder.saved || []).filter((s) => !itemIdSet || itemIdSet.has(s.id))
    for (const item of items) {
      try {
        await apiHelper.post(`/api/users/me/folders/${serverFolderId}/saved`, {
          externalId: item.externalId,
          mediaType: item.mediaType,
          title: item.title,
          poster_url: item.poster_url,
          category: item.category,
          vote_average: item.vote_average,
          release_date: item.release_date,
          genre_ids: item.genre_ids,
          overview: item.overview,
          episode_group: item.episode_group,
        })
        migrated++
      } catch (e) {
        console.warn('[savedHelper] Failed to add item to server', item.title, e)
      }
    }
  }

  write({ folders: [] })
  return { migrated, foldersCreated }
}

/**
 * Clear guest saved data from localStorage (e.g. after "Don't import").
 */
export function clearGuestSaved() {
  write({ folders: [] })
}

export { GUEST_MAX_FOLDERS, GUEST_MAX_SAVED_PER_FOLDER, STORAGE_KEY }
