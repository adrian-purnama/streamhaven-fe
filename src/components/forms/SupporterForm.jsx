import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Plus, Trash2, Crown, Medal, Award, Shield,
  Twitter, Github, Instagram, Youtube, Globe, ExternalLink, Twitch, Linkedin, Facebook, Ban,
} from 'lucide-react'
import apiHelper from '../../helper/apiHelper'
import SearchableDropdown from '../SearchableDropdown'

const SUPPORTER_TYPES = [
  { value: 'platinum', label: 'Platinum', Icon: Crown, color: 'text-cyan-300' },
  { value: 'gold', label: 'Gold', Icon: Medal, color: 'text-amber-400' },
  { value: 'silver', label: 'Silver', Icon: Award, color: 'text-gray-300' },
  { value: 'bronze', label: 'Bronze', Icon: Shield, color: 'text-orange-400' },
]

const ICON_MAP = {
  twitter: Twitter,
  github: Github,
  instagram: Instagram,
  youtube: Youtube,
  twitch: Twitch,
  linkedin: Linkedin,
  facebook: Facebook,
  globe: Globe,
}

const ICON_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'github', label: 'GitHub' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'globe', label: 'Website' },
]

function renderTierOption(item) {
  const TierIcon = item.Icon
  return (
    <span className={`inline-flex items-center gap-2 ${item.color}`}>
      <TierIcon className="w-4 h-4 shrink-0" aria-hidden />
      {item.label}
    </span>
  )
}

function renderIconOption(item) {
  const IconComp = item.value ? (ICON_MAP[item.value] || ExternalLink) : Ban
  return (
    <span className="inline-flex items-center gap-2">
      <IconComp className="w-4 h-4 shrink-0 text-gray-400" aria-hidden />
      {item.label}
    </span>
  )
}

function SupporterForm({ initialValues, onSubmit, onCancel, isCreate = false }) {
  const [userId, setUserId] = useState(
    typeof initialValues?.userId === 'object' ? initialValues.userId._id ?? '' : initialValues?.userId ?? ''
  )
  const [supporterType, setSupporterType] = useState(initialValues?.supporterType ?? 'bronze')
  const [displayName, setDisplayName] = useState(initialValues?.displayName ?? '')
  const [order, setOrder] = useState(initialValues?.order ?? 0)
  const [tagLine, setTagLine] = useState(initialValues?.tagLine ?? '')
  const [isVerified, setIsVerified] = useState(initialValues?.isVerified ?? false)
  const [links, setLinks] = useState(
    Array.isArray(initialValues?.links) && initialValues.links.length > 0
      ? initialValues.links.map((l) => ({ label: l.label || '', link: l.link || '', icon: l.icon || '' }))
      : [{ label: '', link: '', icon: '' }]
  )

  // User search state
  const [userOptions, setUserOptions] = useState([])
  const [userLoading, setUserLoading] = useState(false)
  const debounceRef = useRef(null)

  // Pre-load the selected user when editing so the dropdown shows a label
  useEffect(() => {
    if (initialValues?.userId) {
      apiHelper
        .get('/api/users', { params: { email: initialValues.userEmail || '', limit: 20 } })
        .then(({ data }) => {
          const list = data?.data ?? []
          // Make sure the current user is in the options even if email search didn't match
          if (list.length === 0 && initialValues.userId) {
            setUserOptions([{ _id: initialValues.userId, email: initialValues.userEmail || initialValues.userId }])
          } else {
            setUserOptions(list)
          }
        })
        .catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const searchUsers = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query || query.trim().length < 2) {
      setUserOptions([])
      setUserLoading(false)
      return
    }
    setUserLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await apiHelper.get('/api/users', { params: { email: query.trim(), limit: 20 } })
        setUserOptions(data?.data ?? [])
      } catch {
        setUserOptions([])
      } finally {
        setUserLoading(false)
      }
    }, 350)
  }, [])

  const addLink = () => setLinks((prev) => [...prev, { label: '', link: '', icon: '' }])

  const removeLink = (idx) => setLinks((prev) => prev.filter((_, i) => i !== idx))

  const updateLink = (idx, field, value) => {
    setLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleaned = links
      .filter((l) => l.label.trim() && l.link.trim())
      .map((l) => ({ label: l.label.trim(), link: l.link.trim(), icon: l.icon.trim() }))
    onSubmit({
      userId: userId.trim(),
      supporterType,
      displayName: displayName.trim(),
      order: Number(order),
      tagLine: tagLine.trim(),
      isVerified,
      links: cleaned,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          User (search by email)
        </label>
        <SearchableDropdown
          options={userOptions}
          valueKey="_id"
          labelKey="email"
          value={userId}
          onChange={(id) => setUserId(id)}
          onSearchChange={searchUsers}
          loading={userLoading}
          placeholder="Type email to search…"
        />
        {userId && (
          <p className="text-xs text-gray-500 mt-1 font-mono truncate">ID: {userId}</p>
        )}
      </div>

      <div>
        <label htmlFor="supporter-displayName" className="block text-sm font-medium text-gray-300 mb-1">
          Display name
        </label>
        <input
          id="supporter-displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Name shown on landing page"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tier
          </label>
          <SearchableDropdown
            options={SUPPORTER_TYPES}
            valueKey="value"
            labelKey="label"
            value={supporterType}
            onChange={(val) => setSupporterType(val)}
            renderOption={renderTierOption}
            placeholder="Select tier…"
          />
        </div>
        <div>
          <label htmlFor="supporter-order" className="block text-sm font-medium text-gray-300 mb-1">
            Order
          </label>
          <input
            id="supporter-order"
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="0"
            required
          />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isVerified}
          onChange={(e) => setIsVerified(e.target.checked)}
          className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500 w-4 h-4"
        />
        <span className="text-sm font-medium text-gray-300">Verified supporter</span>
      </label>

      <div>
        <label htmlFor="supporter-tagLine" className="block text-sm font-medium text-gray-300 mb-1">
          Message / Tagline
        </label>
        <textarea
          id="supporter-tagLine"
          value={tagLine}
          onChange={(e) => setTagLine(e.target.value)}
          rows={2}
          maxLength={200}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
          placeholder="A short message or tagline (optional, max 200 chars)"
        />
        <p className="text-xs text-gray-500 mt-0.5 text-right">{tagLine.length}/200</p>
      </div>

      {/* Links */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Links</span>
          <button
            type="button"
            onClick={addLink}
            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden /> Add link
          </button>
        </div>
        <div className="space-y-3">
          {links.map((l, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg bg-gray-700/50 border border-gray-600/50">
              <div className="flex gap-2 items-start">
                <input
                  type="text"
                  value={l.label}
                  onChange={(e) => updateLink(idx, 'label', e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Label (e.g. Twitter)"
                />
                {links.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLink(idx)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded mt-0.5"
                    title="Remove link"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                )}
              </div>
              <div>
                <SearchableDropdown
                  options={ICON_OPTIONS}
                  valueKey="value"
                  labelKey="label"
                  value={l.icon}
                  onChange={(val) => updateLink(idx, 'icon', val)}
                  renderOption={renderIconOption}
                  placeholder="Icon…"
                />
              </div>
              <input
                type="url"
                value={l.link}
                onChange={(e) => updateLink(idx, 'link', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="https://..."
              />
            </div>
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

export default SupporterForm;
