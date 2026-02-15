import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Unlock, ShieldCheck, Heart, BadgeCheck,
  Twitter, Github, Instagram, Youtube, Globe, ExternalLink, Twitch, Linkedin, Facebook,
} from 'lucide-react'
import { useImage } from '../context/ImageContext'
import { baseURL } from '../helper/apiHelper'
import apiHelper from '../helper/apiHelper'
import MultiSearch from '../components/MultiSearch'
import Modal from '../components/Modal'
import { DotPattern } from '../components/ui/dot-pattern'
import { cn } from "@/lib/utils"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { Highlighter } from "@/components/ui/highlighter"

const VALUES = [
  {
    title: 'Freedom',
    description: 'Save anything, anytime — even as a guest.',
    Icon: Unlock,
    accent: 'from-amber-500/20 to-amber-600/5',
    glow: 'group-hover:shadow-amber-500/20',
    iconColor: 'text-amber-400',
    border: 'border-amber-500/20 group-hover:border-amber-500/40',
  },
  {
    title: 'Privacy',
    description: 'Local-first. Cloud only when you say so.',
    Icon: ShieldCheck,
    accent: 'from-emerald-500/20 to-emerald-600/5',
    glow: 'group-hover:shadow-emerald-500/20',
    iconColor: 'text-emerald-400',
    border: 'border-emerald-500/20 group-hover:border-emerald-500/40',
  },
  {
    title: 'Community',
    description: 'Supporters drive us forward. Minimal ads. Minimal nonsense.',
    Icon: Heart,
    accent: 'from-rose-500/20 to-rose-600/5',
    glow: 'group-hover:shadow-rose-500/20',
    iconColor: 'text-rose-400',
    border: 'border-rose-500/20 group-hover:border-rose-500/40',
  },
]

const LINK_ICON_MAP = {
  twitter:   Twitter,
  github:    Github,
  instagram: Instagram,
  youtube:   Youtube,
  twitch:    Twitch,
  linkedin:  Linkedin,
  facebook:  Facebook,
  globe:     Globe,
}

function LinkIcon({ name }) {
  const Icon = LINK_ICON_MAP[name] || ExternalLink
  return <Icon className="w-4 h-4 shrink-0" aria-hidden />
}

const EMPTY_GROUPS = { Platinum: [], Gold: [], Silver: [], Bronze: [] }

const tierColors = {
  Platinum: 'border-cyan-300 text-cyan-200',
  Gold: 'border-yellow-400 text-yellow-300',
  Silver: 'border-gray-300 text-blue-300',
  Bronze: 'border-amber-500 text-amber-600',
}

function resolveProfileUrl(supporter) {
  const url = supporter.userId?.profile_url
  if (!url) return ''
  if (url.startsWith('http')) return url
  return baseURL + url
}

function SupporterCard({ supporter, tierColor, onOpenModal }) {
  const profileUrl = resolveProfileUrl(supporter)
  const name = supporter.displayName || '?'
  const links = Array.isArray(supporter.links) ? supporter.links : []
  const hasOne = links.length === 1
  const hasMany = links.length > 1

  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false })
  const rafRef = useRef(null)
  const latestRef = useRef({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e) => {
    latestRef.current = { x: e.clientX, y: e.clientY }
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        setCursor({ x: latestRef.current.x, y: latestRef.current.y, visible: true })
      })
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setCursor((p) => ({ ...p, visible: false }))
  }, [])

  const cardContent = (
    <>
      {profileUrl ? (
        <img src={profileUrl} alt={name} className="w-16 h-16 rounded-full mx-auto border-2 border-white object-cover" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-600 text-white mx-auto flex items-center justify-center text-xl font-bold">
          {name[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <p className="mt-3 text-sm text-gray-200 line-clamp-1 inline-flex items-center gap-1 justify-center w-full">
        {name}
        {supporter.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-label="Verified" />}
      </p>
      {links.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          {links.map((link, j) => (
            <span key={j} className="text-gray-400"><LinkIcon name={link.icon} /></span>
          ))}
        </div>
      )}
    </>
  )

  const cardClasses = `relative bg-[#2b2b2b] rounded-lg p-4 text-center border ${tierColor || 'border-gray-600'} hover:scale-105 transition-transform w-[140px]`

  return (
    <div
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {hasOne ? (
        <a href={links[0].link} target="_blank" rel="noopener noreferrer" className={`${cardClasses} block cursor-pointer`} title={links[0].label}>
          {cardContent}
        </a>
      ) : hasMany ? (
        <button type="button" onClick={() => onOpenModal(supporter)} className={`${cardClasses} cursor-pointer`}>
          {cardContent}
        </button>
      ) : (
        <div className={cardClasses}>{cardContent}</div>
      )}

      {/* Cursor-following tooltip for tagLine */}
      {supporter.tagLine && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          className={`fixed z-9999 w-52 pointer-events-none transition-opacity duration-150 ${cursor.visible ? 'opacity-100' : 'opacity-0'}`}
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${cursor.x + 16}px, ${cursor.y + -80}px, 0)`,
            willChange: 'transform',
          }}
        >
          <div className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 shadow-xl text-center">
            <p className="text-xs text-gray-300 italic leading-relaxed">&ldquo;{supporter.tagLine}&rdquo;</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default function LandingPage() {
  const { appName, tagLine, logoFull } = useImage()
  const location = useLocation()
  const [supporterGroups, setSupporterGroups] = useState(EMPTY_GROUPS)
  const [selectedSupporter, setSelectedSupporter] = useState(null)

  const navigate = useNavigate()
  

  useEffect(() => {
    apiHelper.get('/api/supporters')
      .then(({ data }) => {
        const d = data?.data ?? {}
        setSupporterGroups({
          Platinum: d.platinum ?? [],
          Gold: d.gold ?? [],
          Silver: d.silver ?? [],
          Bronze: d.bronze ?? [],
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [location])

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20 px-6">
      <div className="max-w-6xl mx-auto relative">
        
        <div className="pointer-events-none absolute top-[-10rem] left-0 right-0 z-0 h-[min(200vh,800px)]">
          <DotPattern
          glow={true}
            className={cn(
              "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
            )}
          />
        </div>
        
        <div id="about" className="relative z-10 text-center mb-16">
          <img
            src={logoFull}
            alt={appName}
            className="max-w-[20rem] w-fit mx-auto mb-6"
          />
          <p className="text-lg text-gray-300">
                        {tagLine}
                    </p>
                    <div className="w-full max-w-xl mx-auto mt-10">
                      <div className="flex flex-col items-center gap-6">
                        <ShimmerButton
                          className="w-full sm:w-auto border-orange-500/30 hover:border-orange-400/50"
                          background="rgb(254,154,0)"
                          shimmerColor="rgb(255, 255, 255)"
                          borderRadius="0.5rem"
                          onClick={() => navigate('/home')}
                        >
                          Discover Site
                        </ShimmerButton>
                        <div className="flex items-center gap-4 w-full">
                          <span className="flex-1 h-px bg-gray-600/80" aria-hidden />
                          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">or</span>
                          <span className="flex-1 h-px bg-gray-600/80" aria-hidden />
                        </div>
                        <div className="w-full">
                          <MultiSearch />
                        </div>
                      </div>
                    </div>

                    <p className="mt-10 text-sm text-gray-400 max-w-160 mx-auto">
                        <Highlighter color="red">
                          <strong className="text-white">Disclaimer:</strong>
                        </Highlighter>

                        Any 
                        <Highlighter color="#FE9A00" action="underline">
                          advertisements  
                        </Highlighter>
                          shown  during playback are from third-party video providers.
                          {appName} does not control or benefit from these 
                          
                          <Highlighter color="#FE9A00" action="underline">
                            ads
                          </Highlighter>
                          
                          . We&apos;re working to move toward a fully 
                          
                          <Highlighter color="#FE9A00" action="underline">
                            ad-free experience.
                          </Highlighter>

                    </p>
                </div>
        <section
          id="values"
          className="relative z-10 grid md:grid-cols-3 gap-8 mb-20"
          style={{ perspective: '900px' }}
        >
          {VALUES.map((card) => {
            const { title, description, accent, glow, iconColor, border } = card
            const CardIcon = card.Icon
            return (
            <div
              key={title}
              className={`group relative rounded-2xl border bg-gray-800/60 backdrop-blur-sm p-8 transition-all duration-500 ease-out
                shadow-lg ${glow} group-hover:shadow-2xl
                ${border}
                hover:-translate-y-2`}
              style={{
                transformStyle: 'preserve-3d',
                transition: 'transform 0.5s cubic-bezier(.25,.46,.45,.94), box-shadow 0.5s ease',
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width - 0.5
                const y = (e.clientY - rect.top) / rect.height - 0.5
                e.currentTarget.style.transform = `rotateY(${x * 35}deg) rotateX(${-y * 35}deg) translateY(-8px)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = ''
              }}
            >
              {/* Gradient backdrop */}
              <div
                className={`absolute inset-0 rounded-2xl bg-linear-to-br ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                aria-hidden
              />

              {/* Icon */}
              <div
                className="relative mb-5"
                style={{ transform: 'translateZ(30px)' }}
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gray-700/50 ${iconColor} ring-1 ring-white/5 group-hover:ring-white/10 transition-all duration-500 group-hover:scale-110`}>
                  <CardIcon className="w-7 h-7" strokeWidth={1.8} aria-hidden />
                </div>
              </div>

              {/* Text */}
              <div className="relative" style={{ transform: 'translateZ(20px)' }}>
                <h2 className="text-xl font-bold mb-2 text-gray-100 tracking-tight">{title}</h2>
                <p className="text-gray-400 leading-relaxed text-sm">{description}</p>
              </div>
            </div>
            )
          })}
        </section>

        <section id="supporters" className="relative z-10 pb-20">
          <h2 className="text-3xl font-bold text-center mb-10 text-gray-100">Our Supporters</h2>

          {Object.entries(supporterGroups).map(([tier, group]) => (
            <div key={tier} className="mb-16">
              <h3 className={`text-2xl font-bold text-center mb-6 ${tierColors[tier]}`}>
                <span className={tierColors[tier]}>{tier}</span> Tier
              </h3>

              {group.length === 0 ? (
                <div className="text-center text-gray-400 italic">
                  Be the first to be featured in the <span className={tierColors[tier]}>{tier}</span> tier!
                  <div className="mt-2 not-italic">
                    <a href="https://saweria.co/StreamHavenOfficial" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Donate</a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-6">
                  {group.map((supporter) => (
                    <SupporterCard
                      key={supporter._id || supporter.order}
                      supporter={supporter}
                      tierColor={tierColors[tier]}
                      onOpenModal={setSelectedSupporter}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </div>

      {/* Supporter links modal */}
      <Modal
        open={!!selectedSupporter}
        onClose={() => setSelectedSupporter(null)}
        title={selectedSupporter?.displayName || 'Supporter'}
      >
        {selectedSupporter && (
          <div className="space-y-4">
            {selectedSupporter.tagLine && (
              <p className="text-sm text-gray-300 italic leading-relaxed">
                &ldquo;{selectedSupporter.tagLine}&rdquo;
              </p>
            )}
            <div className="space-y-2">
              {(selectedSupporter.links || []).map((link, i) => (
                <a
                  key={i}
                  href={link.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600/50 hover:border-amber-500/50 hover:bg-gray-700 transition-colors group"
                >
                  <span className="text-gray-400 group-hover:text-amber-400 transition-colors">
                    <LinkIcon name={link.icon} />
                  </span>
                  <span className="text-gray-200 text-sm font-medium">{link.label}</span>
                  <span className="ml-auto text-gray-500 text-xs truncate max-w-[140px]">{link.link}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
