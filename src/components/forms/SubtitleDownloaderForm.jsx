import { useState, useEffect, useRef } from 'react'
import { Captions, Check, Loader2, Download, RefreshCw, Search } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'
import apiHelper from '../../helper/apiHelper'
import toast from 'react-hot-toast'

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

const LANG_LABELS = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic',
  ru: 'Russian', hi: 'Hindi', nl: 'Dutch', pl: 'Polish', sv: 'Swedish',
  da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech', tr: 'Turkish',
  th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ro: 'Romanian', el: 'Greek',
  he: 'Hebrew', hu: 'Hungarian', uk: 'Ukrainian', ms: 'Malay', hr: 'Croatian',
  bg: 'Bulgarian', sk: 'Slovak', sl: 'Slovenian', sr: 'Serbian', fa: 'Persian',
  bn: 'Bengali', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', ur: 'Urdu',
  lv: 'Latvian', lt: 'Lithuanian', et: 'Estonian', bs: 'Bosnian', si: 'Sinhala',
}

function langLabel(code) {
  return LANG_LABELS[code] || code.toUpperCase()
}

export default function SubtitleDownloaderForm({
  externalId,
}) {
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState([])
  const [downloaded, setDownloaded] = useState([])
  const [downloading, setDownloading] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const recaptchaRef = useRef(null)
  const needsRecaptcha = Boolean(recaptchaSiteKey)

  const fetchAvailable = async () => {
    if (!externalId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await apiHelper.get('/api/languages/subtitle-available', {
        params: { externalId },
      })
      if (data?.success) {
        setAvailable(data.data?.availableSubtitles || [])
        setDownloaded(data.data?.downloadedSubtitles || [])
      }
    } catch {
      toast.error('Failed to fetch available subtitles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAvailable() }, [externalId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async (lang) => {
    if (needsRecaptcha && !recaptchaRef.current?.getValue?.()) {
      toast.error('Please complete the captcha verification')
      return
    }
    setDownloading(lang)
    try {
      const payload = { externalId, language: lang }
      if (needsRecaptcha) payload.recaptchaToken = recaptchaRef.current.getValue()
      const { data } = await apiHelper.post('/api/languages/download-subtitle', payload)
      if (data?.success) {
        toast.success(data.message || 'Subtitle downloaded')
        setDownloaded((prev) => [...new Set([...prev, lang])])
        recaptchaRef.current?.reset?.()
      } else {
        toast.error(data?.message || 'Download failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const sorted = [...available].sort((a, b) => {
    const aDown = downloaded.includes(a)
    const bDown = downloaded.includes(b)
    if (aDown !== bDown) return aDown ? -1 : 1
    if (a === 'en') return -1
    if (b === 'en') return 1
    return langLabel(a).localeCompare(langLabel(b))
  })

  const q = (searchQuery || '').trim().toLowerCase()
  const filtered = q
    ? sorted.filter(
        (lang) =>
          langLabel(lang).toLowerCase().includes(q) || lang.toLowerCase().includes(q)
      )
    : sorted

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Captions className="w-4 h-4" />
          <span>{available.length} language{available.length !== 1 ? 's' : ''} available</span>
        </div>
        {!loading && (
          <button
            type="button"
            onClick={fetchAvailable}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Fetching available subtitles…
        </div>
      )}

      {/* Empty */}
      {!loading && available.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">
          No subtitles found for this video on indexsubtitle.
        </p>
      )}

      {/* Search */}
      {!loading && sorted.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search languages..."
            className={`w-full pl-9 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 ${searchQuery ? 'pr-14' : 'pr-3'}`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-medium"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Language list */}
      {!loading && sorted.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No languages match your search.</p>
          ) : (
          filtered.map((lang) => {
            const isDownloaded = downloaded.includes(lang)
            const isDownloading = downloading === lang
            return (
              <div
                key={lang}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/60"
              >
                <span className="text-sm text-gray-200">
                  {langLabel(lang)}
                  <span className="ml-1.5 text-[10px] text-gray-500 uppercase">{lang}</span>
                </span>
                {isDownloaded ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Downloaded
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDownload(lang)}
                    disabled={!!downloading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/90 text-gray-900 text-xs font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDownloading ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Downloading…</>
                    ) : (
                      <><Download className="w-3 h-3" /> Download</>
                    )}
                  </button>
                )}
              </div>
            )
          })
          )}
        </div>
      )}

      {!loading && sorted.length > 0 && needsRecaptcha && (
        <div className="[&_.grecaptcha-badge]:bottom-14! mt-2">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={recaptchaSiteKey}
            theme="dark"
            size="normal"
          />
        </div>
      )}
    </div>
  )
}
