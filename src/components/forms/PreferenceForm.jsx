import { useState } from 'react'
import { Bookmark, EyeOff, Play, Star, Type, MessageSquare, BadgeCheck } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'

const SAVE_BUTTON_OPTIONS = [
  { value: 'bottom_center', label: 'Bottom center', Icon: SaveBottomCenterIcon },
  { value: 'top_right', label: 'Top right of poster', Icon: SaveTopRightIcon },
  { value: 'hidden', label: 'Hidden', Icon: SaveHiddenIcon },
]

/** Mini preview: poster frame with bookmark at bottom center */
function SaveBottomCenterIcon({ className = '' }) {
  return (
    <div className={`relative rounded-lg border border-gray-600 bg-gray-700/80 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 flex items-end justify-center pb-1">
        <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400/20" strokeWidth={2} />
      </div>
    </div>
  )
}

/** Mini preview: poster frame with bookmark at top right */
function SaveTopRightIcon({ className = '' }) {
  return (
    <div className={`relative rounded-lg border border-gray-600 bg-gray-700/80 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute top-1 right-1">
        <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400/20" strokeWidth={2} />
      </div>
    </div>
  )
}

/** Mini preview: no save button (hidden) */
function SaveHiddenIcon({ className = '' }) {
  return (
    <div className={`rounded-lg border border-gray-600 bg-gray-700/80 flex items-center justify-center ${className}`} aria-hidden>
      <EyeOff className="w-6 h-6 text-gray-500" strokeWidth={2} />
    </div>
  )
}

/** Icon preview box for a row preference */
function PreferenceIconBox({ icon: Icon, className = '' }) {
  return (
    <div
      className={`rounded-lg border border-gray-600 bg-gray-700/80 flex items-center justify-center text-gray-400 ${className}`}
      aria-hidden
    >
      <Icon className="w-8 h-8 shrink-0" strokeWidth={2} />
    </div>
  )
}

export default function PreferenceForm() {
  const { preferences, preferencesLoading, updatePreference } = usePreferences()
  const [saving, setSaving] = useState(false)

  const handleUpdate = async (key, value) => {
    setSaving(true)
    try {
      await updatePreference(key, value)
    } finally {
      setSaving(false)
    }
  }

  if (preferencesLoading) {
    return (
      <div className="border-t border-gray-700 pt-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Display</h2>
        <p className="text-gray-500 text-sm">Loading preferences…</p>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-700 pt-6">
      <h2 className="text-lg font-semibold text-gray-100 mb-3">Display</h2>
      <p className="text-gray-400 text-sm mb-4">Choose how posters and the home page are shown.</p>

      <div className="space-y-6">
        {/* Save button position */}
        <div>
          <p className="text-gray-400 text-sm mb-3">Save button</p>
          <div className="flex flex-wrap gap-4">
            {SAVE_BUTTON_OPTIONS.map((opt) => {
              const Icon = opt.Icon
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={saving}
                  onClick={() => handleUpdate('saveButtonPosition', opt.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors disabled:opacity-50 text-left ${
                    preferences.saveButtonPosition === opt.value
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                  }`}
                >
                  <Icon className="w-24 h-16" />
                  <span className={`text-sm font-medium ${preferences.saveButtonPosition === opt.value ? 'text-amber-400' : 'text-gray-300'}`}>
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Show Watch button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
          <div className="flex gap-4 flex-1">
            <PreferenceIconBox icon={Play} className="w-20 h-14 shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-400 text-sm font-medium">Show &quot;Watch now&quot; button</p>
              <p className="text-gray-500 text-xs mt-0.5">If off, clicking the poster will open watch immediately.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdate('showWatchButton', !preferences.showWatchButton)}
            className={`shrink-0 w-12 h-7 rounded-full p-0.5 flex items-center transition-colors disabled:opacity-50 ${
              preferences.showWatchButton ? 'bg-amber-500 justify-end' : 'bg-gray-600 justify-start'
            }`}
            aria-pressed={preferences.showWatchButton}
          >
            <span className="block w-5 h-5 rounded-full bg-white shadow" />
          </button>
        </div>

        {/* Show Top pick on home */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
          <div className="flex gap-4 flex-1">
            <PreferenceIconBox icon={Star} className="w-20 h-14 shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-400 text-sm font-medium">Show Top pick on home</p>
              <p className="text-gray-500 text-xs mt-0.5">Show or hide the Top pick row on the home page.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdate('showTopPickOnHome', !preferences.showTopPickOnHome)}
            className={`shrink-0 w-12 h-7 rounded-full p-0.5 flex items-center transition-colors disabled:opacity-50 ${
              preferences.showTopPickOnHome ? 'bg-amber-500 justify-end' : 'bg-gray-600 justify-start'
            }`}
            aria-pressed={preferences.showTopPickOnHome}
          >
            <span className="block w-5 h-5 rounded-full bg-white shadow" />
          </button>
        </div>

        {/* Show title on poster (showPosterTitle) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
          <div className="flex gap-4 flex-1">
            <PreferenceIconBox icon={Type} className="w-20 h-14 shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-400 text-sm font-medium">Show title on poster</p>
              <p className="text-gray-500 text-xs mt-0.5">Show the movie or TV title below each poster.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdate('showPosterTitle', !(preferences.showPosterTitle ?? false))}
            className={`shrink-0 w-12 h-7 rounded-full p-0.5 flex items-center transition-colors disabled:opacity-50 ${
              (preferences.showPosterTitle ?? false) ? 'bg-amber-500 justify-end' : 'bg-gray-600 justify-start'
            }`}
            aria-pressed={preferences.showPosterTitle ?? false}
          >
            <span className="block w-5 h-5 rounded-full bg-white shadow" />
          </button>
        </div>

        {/* Show promo ticker on home (showPromoTicker) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
          <div className="flex gap-4 flex-1">
            <PreferenceIconBox icon={MessageSquare} className="w-20 h-14 shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-400 text-sm font-medium">Show promo ticker on home</p>
              <p className="text-gray-500 text-xs mt-0.5">Log in for no ads, feedback link, and more. You can turn this off here.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdate('showPromoTicker', !(preferences.showPromoTicker ?? true))}
            className={`shrink-0 w-12 h-7 rounded-full p-0.5 flex items-center transition-colors disabled:opacity-50 ${
              (preferences.showPromoTicker ?? true) ? 'bg-amber-500 justify-end' : 'bg-gray-600 justify-start'
            }`}
            aria-pressed={preferences.showPromoTicker ?? true}
          >
            <span className="block w-5 h-5 rounded-full bg-white shadow" />
          </button>
        </div>

        {/* Show Ad-free status on poster (showAdFreeStatus) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
          <div className="flex gap-4 flex-1">
            <PreferenceIconBox icon={BadgeCheck} className="w-20 h-14 shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-400 text-sm font-medium">Show Ad-free badge on poster</p>
              <p className="text-gray-500 text-xs mt-0.5">Show the Ad-free badge on the top-left of movie posters when available.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdate('showAdFreeStatus', !(preferences.showAdFreeStatus ?? true))}
            className={`shrink-0 w-12 h-7 rounded-full p-0.5 flex items-center transition-colors disabled:opacity-50 ${
              (preferences.showAdFreeStatus ?? true) ? 'bg-amber-500 justify-end' : 'bg-gray-600 justify-start'
            }`}
            aria-pressed={preferences.showAdFreeStatus ?? true}
          >
            <span className="block w-5 h-5 rounded-full bg-white shadow" />
          </button>
        </div>
      </div>
    </div>
  )
}
