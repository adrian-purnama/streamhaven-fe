import React, { useState } from 'react'

const USED_FOR_OPTIONS = [
  { value: 'movie', label: 'Movie' },
  { value: 'tv', label: 'TV' },
  { value: 'anime', label: 'Anime' },
]

const ServerForm = ({ initialValues, onSubmit, onCancel, isCreate = false }) => {
  const [link, setLink] = useState(initialValues?.link ?? '')
  const [usedFor, setUsedFor] = useState(
    Array.isArray(initialValues?.usedFor) ? [...initialValues.usedFor] : []
  )
  const [label, setLabel] = useState(initialValues?.label ?? '')
  const [watchPathPattern, setWatchPathPattern] = useState(
    initialValues?.watchPathPattern ?? ''
  )

  const toggleUsedFor = (value) => {
    setUsedFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      link: link.trim(),
      usedFor,
      label: label.trim(),
      watchPathPattern: watchPathPattern.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="server-link" className="block text-sm font-medium text-gray-300 mb-1">
          Link (base URL, no trailing slash)
        </label>
        <input
          id="server-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="https://example.com"
          required
        />
      </div>
      <div>
        <label htmlFor="server-label" className="block text-sm font-medium text-gray-300 mb-1">
          Label (e.g. &quot;Server 1&quot;, &quot;Backup&quot;)
        </label>
        <input
          id="server-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Server 1"
        />
      </div>
      <div>
        <label htmlFor="server-pattern" className="block text-sm font-medium text-gray-300 mb-1">
          Watch path pattern (use {'{externalId}'} for TMDB id)
        </label>
        <input
          id="server-pattern"
          type="text"
          value={watchPathPattern}
          onChange={(e) => setWatchPathPattern(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm"
          placeholder="/movie/{externalId} or ?id={externalId} or leave empty"
        />
        <p className="text-xs text-gray-500 mt-1">
          Final URL = Link + this (e.g. https://site.com + /movie/12345)
        </p>
      </div>
      <div>
        <span className="block text-sm font-medium text-gray-300 mb-2">Used for</span>
        <div className="flex flex-wrap gap-3">
          {USED_FOR_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={usedFor.includes(opt.value)}
                onChange={() => toggleUsedFor(opt.value)}
                className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-200">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded bg-amber-500 text-gray-900 hover:bg-amber-400 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {isCreate ? 'Create' : 'Update'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded bg-gray-600 text-gray-200 hover:bg-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default ServerForm
