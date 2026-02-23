import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import apiHelper, { baseURL } from '../../helper/apiHelper'
import { useImage } from '../../context/ImageContext'
import { useAuth } from '../../context/AuthContext'
import {
  getGuestSaved,
  migrateGuestSavedToAccount,
  migrateGuestSavedToAccountCustom,
  clearGuestSaved,
} from '../../helper/savedHelper'

/* ─── keyframes for Registration Closed scene ─── */
const RC_STYLE_ID = 'rc-keyframes'
const RC_KEYFRAMES = `
@keyframes rc-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes rc-float-slow{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes rc-float-delay{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes rc-blink{0%,46%,54%,100%{transform:scaleY(1)}50%{transform:scaleY(.08)}}
@keyframes rc-wiggle{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes rc-swing{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg)}}
@keyframes rc-pulse{0%,100%{opacity:.4;filter:blur(18px)}50%{opacity:.85;filter:blur(28px)}}
@keyframes rc-drift{0%{transform:translate(0,0);opacity:.6}50%{opacity:1}100%{transform:translate(var(--dx),var(--dy));opacity:0}}
@keyframes rc-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
@keyframes rc-neon{0%,100%{text-shadow:0 0 6px rgba(251,59,59,.6),0 0 20px rgba(251,59,59,.3)}50%{text-shadow:0 0 12px rgba(251,59,59,.9),0 0 40px rgba(251,59,59,.5)}}
@keyframes rc-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes rc-glow-pulse{0%,100%{box-shadow:0 0 20px rgba(251,191,36,.15)}50%{box-shadow:0 0 35px rgba(251,191,36,.35)}}
@keyframes rc-headphone-bob{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-3px) rotate(-2deg)}75%{transform:translateY(-3px) rotate(2deg)}}
@keyframes rc-lock-glow{0%,100%{filter:drop-shadow(0 0 4px rgba(251,59,59,.4))}50%{filter:drop-shadow(0 0 12px rgba(251,59,59,.8))}}
`

/* ─── seeded random ─── */
function rcRand(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

/* ─── Particles ─── */
function RcParticles({ count = 25 }) {
  const [items] = useState(() => {
    const r = rcRand(77)
    return Array.from({ length: count }, (_, i) => ({
      id: i, left: r() * 100, top: r() * 100, size: 2 + r() * 3,
      dur: 4 + r() * 6, delay: r() * 5,
      dx: (r() - .5) * 100, dy: -(25 + r() * 70),
      hue: r() > .5 ? '0' : '45',
    }))
  })
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {items.map(p => (
        <div key={p.id} className="absolute rounded-full" style={{
          left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size,
          background: `hsl(${p.hue} 80% 65%)`,
          '--dx': `${p.dx}px`, '--dy': `${p.dy}px`,
          animation: `rc-drift ${p.dur}s ${p.delay}s ease-out infinite`,
        }} />
      ))}
    </div>
  )
}

/* ─── Floating logos ─── */
function RcFloatingLogos({ logo }) {
  const inst = [
    { left: '6%', top: '12%', size: 36, opacity: .09, durX: 20, durY: 24 },
    { left: '82%', top: '8%', size: 44, opacity: .07, durX: 26, durY: 18 },
    { left: '88%', top: '70%', size: 30, opacity: .08, durX: 18, durY: 22 },
    { left: '12%', top: '75%', size: 38, opacity: .06, durX: 24, durY: 20 },
    { left: '50%', top: '4%', size: 28, opacity: .05, durX: 22, durY: 26 },
    { left: '70%', top: '50%', size: 20, opacity: .05, durX: 28, durY: 16 },
    { left: '30%', top: '85%', size: 32, opacity: .07, durX: 16, durY: 24 },
  
    // NEW GENERATED ONES
    { left: '18%', top: '22%', size: 40, opacity: .06, durX: 21, durY: 27 },
    { left: '92%', top: '18%', size: 26, opacity: .05, durX: 29, durY: 20 },
    { left: '75%', top: '30%', size: 34, opacity: .07, durX: 24, durY: 19 },
    { left: '5%', top: '45%', size: 22, opacity: .05, durX: 18, durY: 30 },
    { left: '40%', top: '18%', size: 30, opacity: .06, durX: 26, durY: 23 },
    { left: '60%', top: '12%', size: 46, opacity: .08, durX: 20, durY: 28 },
    { left: '25%', top: '55%', size: 28, opacity: .05, durX: 30, durY: 17 },
    { left: '80%', top: '62%', size: 36, opacity: .07, durX: 22, durY: 26 },
    { left: '55%', top: '70%', size: 24, opacity: .05, durX: 27, durY: 18 },
    { left: '15%', top: '90%', size: 42, opacity: .06, durX: 19, durY: 25 },
    { left: '65%', top: '88%', size: 30, opacity: .07, durX: 23, durY: 21 },
    { left: '90%', top: '92%', size: 38, opacity: .06, durX: 25, durY: 29 },
  
    { left: '33%', top: '8%', size: 20, opacity: .04, durX: 32, durY: 16 },
    { left: '47%', top: '28%', size: 44, opacity: .08, durX: 18, durY: 24 },
    { left: '58%', top: '35%', size: 26, opacity: .05, durX: 28, durY: 19 },
    { left: '10%', top: '60%', size: 34, opacity: .06, durX: 21, durY: 27 },
    { left: '38%', top: '66%', size: 22, opacity: .05, durX: 30, durY: 20 },
    { left: '72%', top: '78%', size: 40, opacity: .07, durX: 19, durY: 26 },
    { left: '48%', top: '92%', size: 28, opacity: .06, durX: 24, durY: 18 },
    { left: '96%', top: '40%', size: 32, opacity: .05, durX: 29, durY: 23 },
    { left: '2%', top: '25%', size: 46, opacity: .08, durX: 17, durY: 31 },
    { left: '85%', top: '48%', size: 24, opacity: .05, durX: 33, durY: 15 },
  
    { left: '22%', top: '38%', size: 30, opacity: .06, durX: 25, durY: 22 },
    { left: '63%', top: '58%', size: 36, opacity: .07, durX: 20, durY: 29 },
    { left: '44%', top: '48%', size: 18, opacity: .04, durX: 34, durY: 17 },
    { left: '28%', top: '12%', size: 26, opacity: .05, durX: 27, durY: 21 },
    { left: '78%', top: '20%', size: 32, opacity: .06, durX: 23, durY: 28 },
    { left: '52%', top: '40%', size: 40, opacity: .08, durX: 19, durY: 24 },
    { left: '8%', top: '82%', size: 24, opacity: .05, durX: 31, durY: 18 },
    { left: '94%', top: '58%', size: 44, opacity: .07, durX: 22, durY: 30 },
    { left: '36%', top: '74%', size: 20, opacity: .04, durX: 35, durY: 16 },
    { left: '58%', top: '84%', size: 34, opacity: .06, durX: 26, durY: 20 },
  ]
  return <>
    {inst.map((g, i) => (
      <div key={i} className="absolute pointer-events-none" style={{
        left: g.left, top: g.top,
        animation: `rc-float ${g.durX}s ease-in-out infinite`,
      }} aria-hidden>
        <img src={logo} alt="" draggable={false} className="select-none" style={{
          width: g.size, height: g.size, objectFit: 'contain',
          opacity: g.opacity, filter: 'grayscale(.3) brightness(1.5)',
          animation: `rc-float-slow ${g.durY}s ease-in-out infinite`,
        }} />
      </div>
    ))}
  </>
}

/* ─── Popcorn mascot with "CLOSED" sign ─── */
function RcPopcornMascot() {
  return (
    <div className="relative w-28 h-36 sm:w-32 sm:h-40 cursor-pointer group"
      style={{ animation: 'rc-float 5s ease-in-out infinite' }} title="Sorry, we're closed!">
      {/* bucket */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-18 sm:w-22 h-18 sm:h-22 rounded-b-2xl rounded-t-lg bg-linear-to-b from-red-500 to-red-700 border-2 border-red-400/40 shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform duration-300"
        style={{ width: '4.5rem', height: '4.5rem' }}>
        <div className="absolute inset-x-0 top-2 h-1 bg-yellow-300/70 rounded-full mx-2" />
        <div className="absolute inset-x-0 top-5 h-1 bg-yellow-300/70 rounded-full mx-2" />
        {/* face */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-900 relative">
            <div className="absolute top-0 left-0.5 w-1 h-1 rounded-full bg-white" />
            <div className="absolute inset-0 origin-center" style={{ animation: 'rc-blink 4s ease-in-out infinite' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
            </div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-gray-900 relative">
            <div className="absolute top-0 left-0.5 w-1 h-1 rounded-full bg-white" />
            <div className="absolute inset-0 origin-center" style={{ animation: 'rc-blink 4s .1s ease-in-out infinite' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
            </div>
          </div>
        </div>
        <div className="absolute top-[3.2rem] left-1/2 -translate-x-1/2 w-2.5 h-1 rounded-full bg-gray-900/70" />
      </div>
      {/* popcorn pile */}
      {/* <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-0.5" style={{ animation: 'rc-wiggle 3s ease-in-out infinite' }}>
        {[10,12,9,13,11].map((w, i) => (
          <div key={i} className="rounded-full" style={{
            width: w, height: w - 1,
            background: 'radial-gradient(circle at 35% 35%, #FFFDD0, #F5DEB3 60%, #DEB887)',
            marginTop: i % 2 === 0 ? 0 : 4,
          }} />
        ))}
      </div> */}
      {/* arm holding CLOSED sign */}
      <div className="absolute -right-10 bottom-6 origin-left" style={{ animation: 'rc-swing 3s ease-in-out infinite' }}>
        <div className="w-3 h-1.5 rounded-full bg-red-600 inline-block" />
        <div className="ml-1 inline-block px-2 py-0.5 bg-red-500 rounded text-[7px] font-black text-white tracking-wider border border-red-300/50 shadow-md"
          style={{ animation: 'rc-neon 2s ease-in-out infinite' }}>
          CLOSED
        </div>
      </div>
    </div>
  )
}

/* ─── TV mascot ─── */
function RcTvMascot() {
  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 cursor-pointer group"
      style={{ animation: 'rc-float-delay 5.5s .5s ease-in-out infinite' }} title="¯\\_(ツ)_/¯">
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-16 sm:h-20 rounded-xl bg-linear-to-b from-gray-700 to-gray-800 border-2 border-gray-600/50 shadow-lg shadow-purple-900/20 group-hover:scale-105 transition-transform duration-300">
        <div className="absolute inset-1.5 rounded-lg bg-linear-to-br from-blue-900/80 to-purple-900/80 border border-blue-500/20 overflow-hidden">
          {[0,1,2,3].map(i => <div key={i} className="h-px bg-white/5 mt-2" />)}
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1 rounded-b-full bg-cyan-400/60" />
        </div>
      </div>
      {/* glasses */}
      <div className="absolute top-5 sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5" style={{ animation: 'rc-wiggle 4s ease-in-out infinite' }}>
        <div className="w-5 h-4 rounded-md border-2 border-amber-400/80 bg-amber-900/30" />
        <div className="w-2 h-0.5 bg-amber-400/60" />
        <div className="w-5 h-4 rounded-md border-2 border-amber-400/80 bg-amber-900/30" />
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-gray-500">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400" style={{ animation: 'rc-pulse 2s ease-in-out infinite' }} />
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-[65%] w-1 h-3 bg-gray-600 rounded-b-sm" />
      <div className="absolute bottom-0 left-1/2 translate-x-[45%] w-1 h-3 bg-gray-600 rounded-b-sm" />
    </div>
  )
}

/* ─── Alien mascot with headphones ─── */
function RcAlienMascot() {
  return (
    <div className="relative w-20 h-24 sm:w-24 sm:h-28 cursor-pointer group"
      style={{ animation: 'rc-float-slow 6s .3s ease-in-out infinite' }} title="Let me in!">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 sm:w-14 h-10 sm:h-12 rounded-b-2xl rounded-t-lg bg-linear-to-b from-green-400 to-green-600 border border-green-300/30 shadow-lg shadow-green-900/20 group-hover:scale-105 transition-transform duration-300" />
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-10 sm:h-12 rounded-full bg-linear-to-b from-green-300 to-green-500 border border-green-200/30 shadow-md">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <div className="w-4 h-5 rounded-full bg-gray-900 border border-green-200/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-lime-400 shadow-sm shadow-lime-400"><div className="w-0.5 h-0.5 rounded-full bg-white mt-0.5 ml-0.5" /></div>
            <div className="absolute inset-0 rounded-full origin-center" style={{ animation: 'rc-blink 5s ease-in-out infinite' }}><div className="w-full h-full rounded-full bg-gray-900" /></div>
          </div>
          <div className="w-4 h-5 rounded-full bg-gray-900 border border-green-200/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-lime-400 shadow-sm shadow-lime-400"><div className="w-0.5 h-0.5 rounded-full bg-white mt-0.5 ml-0.5" /></div>
            <div className="absolute inset-0 rounded-full origin-center" style={{ animation: 'rc-blink 5s .15s ease-in-out infinite' }}><div className="w-full h-full rounded-full bg-gray-900" /></div>
          </div>
        </div>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-1 rounded-b-full bg-gray-900/70" />
      </div>
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-[4.2rem] sm:w-[4.8rem]" style={{ animation: 'rc-headphone-bob 4s ease-in-out infinite' }}>
        <div className="w-full h-3 rounded-t-full border-t-[3px] border-l-[3px] border-r-[3px] border-gray-400" />
        <div className="absolute -bottom-1.5 left-0 w-3 h-4 rounded-md bg-linear-to-b from-gray-500 to-gray-600 border border-gray-400/40" />
        <div className="absolute -bottom-1.5 right-0 w-3 h-4 rounded-md bg-linear-to-b from-gray-500 to-gray-600 border border-gray-400/40" />
      </div>
      {/* arm reaching for door */}
      <div className="absolute bottom-6 -right-2 w-5 h-1.5 rounded-full bg-green-500 rotate-[-15deg] group-hover:rotate-[-30deg] transition-transform origin-left" />
    </div>
  )
}

/* ─── Sealed door ─── */
function SealedDoor() {
  return (
    <div className="relative w-24 h-36 sm:w-28 sm:h-40 mx-auto mb-4" aria-hidden>
      {/* door frame */}
      <div className="absolute inset-0 rounded-t-xl bg-linear-to-b from-gray-600 to-gray-700 border-2 border-gray-500/40 shadow-inner">
        <div className="absolute inset-1 rounded-t-lg bg-linear-to-b from-gray-800 to-gray-900 border border-gray-600/30">
          {/* SIGN UP label */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-700/80 rounded text-[8px] font-bold text-gray-400 tracking-widest border border-gray-500/30">
            SIGN UP
          </div>
          {/* door handle */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-5 rounded-full bg-gray-500/60" />
        </div>
      </div>
      {/* holographic lock */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ animation: 'rc-lock-glow 2s ease-in-out infinite' }}>
        <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center backdrop-blur-sm">
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
      {/* glow ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-red-400/20"
        style={{ animation: 'rc-pulse 3s ease-in-out infinite' }} />
    </div>
  )
}

/* ─── REGISTRATION CLOSED PAGE ─── */
function RegistrationClosed({ logo }) {
  const containerRef = useRef(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!document.getElementById(RC_STYLE_ID)) {
      const s = document.createElement('style')
      s.id = RC_STYLE_ID
      s.textContent = RC_KEYFRAMES
      document.head.appendChild(s)
    }
    return () => { const el = document.getElementById(RC_STYLE_ID); if (el) el.remove() }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return
    const { left, top, width, height } = containerRef.current.getBoundingClientRect()
    setMouse({ x: ((e.clientX - left) / width - .5) * 2, y: ((e.clientY - top) / height - .5) * 2 })
  }, [])

  const px = (f) => `translate(${mouse.x * f}px, ${mouse.y * f}px)`

  const handleNotify = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return toast.error('Please enter your email')
    setSubmitting(true)
    try {
      await apiHelper.post('/api/feedback', {
        feedback: `Waitlist: ${trimmed}`,
        feedbackType: 'register',
      })
      toast.success("You'll be notified when registration opens!")
      setEmail('')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not join waitlist')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove}
      className="relative min-h-[calc(100vh-64px)] overflow-hidden flex items-center justify-center bg-gray-900 selection:bg-amber-500/30 px-4">

      {/* bg radials */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(180,30,30,.10)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(251,191,36,.05)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(59,130,246,.05)_0%,transparent_50%)]" />

      {/* volumetric beams */}
      <div className="absolute top-0 left-[12%] pointer-events-none" aria-hidden>
        <div className="w-36 h-[420px] opacity-[.06]" style={{ background: 'linear-gradient(180deg,rgba(251,59,59,.7) 0%,transparent 100%)', transform: 'rotate(12deg)', filter: 'blur(18px)' }} />
      </div>
      <div className="absolute top-0 right-[15%] pointer-events-none" aria-hidden>
        <div className="w-36 h-[420px] opacity-[.06]" style={{ background: 'linear-gradient(180deg,rgba(251,191,36,.7) 0%,transparent 100%)', transform: 'rotate(-18deg)', filter: 'blur(18px)' }} />
      </div>

      <RcParticles />
      <RcFloatingLogos logo={logo} />

      {/* main content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto py-10" style={{ transform: px(2) }}>

        {/* mascots */}
        <div className="flex items-end justify-center gap-3 sm:gap-6 mb-6" style={{ transform: px(5) }}>
          <RcAlienMascot />
          <RcPopcornMascot />
          <RcTvMascot />
        </div>

        {/* sealed door */}
        <div style={{ transform: px(3) }}>
          <SealedDoor />
        </div>

        {/* headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight select-none mt-2"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #ef4444 100%)',
            backgroundSize: '400% 100%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'rc-shimmer 4s linear infinite',
            filter: 'drop-shadow(0 2px 16px rgba(239,68,68,.3))',
          }}>
          Registration Closed
        </h1>

        <p className="mt-3 text-base sm:text-lg text-gray-300 max-w-md leading-relaxed">
          Stream Haven is currently full. Sign-ups reopen soon.
        </p>

        {/* glassmorphism card */}
        <div className="mt-8 w-full max-w-sm p-6 rounded-2xl bg-gray-800/40 backdrop-blur-xl border border-gray-600/30 shadow-2xl"
          style={{ animation: 'rc-glow-pulse 4s ease-in-out infinite' }}>
          <p className="text-sm text-gray-400 mb-4">Join the waitlist for early access</p>
          <form onSubmit={handleNotify} className="flex gap-2">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              disabled={submitting}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-gray-900/70 border border-gray-600/50 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-60" />
            <button type="submit" disabled={submitting}
              className="group relative shrink-0 px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-400 text-gray-900 font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.04] active:scale-[0.98] transition-all duration-200 overflow-hidden disabled:opacity-60 disabled:pointer-events-none">
              <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              <span className="relative z-10">{submitting ? '…' : 'Notify Me'}</span>
            </button>
          </form>
        </div>

        {/* back link */}
        <Link to="/login" className="mt-6 text-sm text-gray-400 hover:text-amber-400 transition-colors">
          ← Back to login
        </Link>
      </div>

      {/* bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-20 bg-linear-to-t from-gray-950 to-transparent pointer-events-none" />
    </div>
  )
}

const RegisterPage = () => {
  const { logo } = useImage()
  const { verifyToken } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [registrationOpen, setRegistrationOpen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('form') // 'form' | 'import'
  const [importChoice, setImportChoice] = useState(null) // null | 'all' | 'none' | 'custom'
  const [customSelectedFolders, setCustomSelectedFolders] = useState(() => new Set())
  const [customSelectedItems, setCustomSelectedItems] = useState(() => ({})) // { [folderId]: Set<itemId> }
  const [importing, setImporting] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)

  const guestData = getGuestSaved()
  const hasGuestSaved = (guestData.folders || []).length > 0

  useEffect(() => {
    if (otpCooldown <= 0) return
    const id = setInterval(() => setOtpCooldown((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [otpCooldown])

  useEffect(() => {
    const checkRegistration = async () => {
      const t = toast.loading('Checking registration...')
      try {
        const { data } = await apiHelper.get('/auth/check-registration')
        setRegistrationOpen(data.success === true)
      } catch {
        setRegistrationOpen(false)
      } finally {
        setLoading(false)
        toast.dismiss(t)
      }
    }
    checkRegistration()
  }, [])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Email is required')
      return
    }
    const t = toast.loading('Sending OTP...')
    try {
      const { data } = await apiHelper.post('/auth/send-otp', { email })
      toast.success(data.message || 'OTP sent', { id: t })
      setOtpCooldown(120) // 2 minutes
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP'
      toast.error(msg, { id: t })
    }
  }

  const loginAfterRegister = async (userEmail, userPassword) => {
    const { data } = await apiHelper.post('/auth/login', { email: userEmail, password: userPassword })
    if (data?.data?.token) {
      localStorage.setItem('fc-token', data.data.token)
    }
    await verifyToken()
  }

  const finishImportAndGoHome = async () => {
    await verifyToken()
    setStep('form')
    navigate('/home')
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!agreeToTerms) {
      toast.error('Please agree to the Terms and Conditions and Privacy Policy')
      return
    }
    if (!email || !password || !otp) {
      toast.error('Email, password and OTP are required')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Password and confirm password do not match')
      return
    }
    const t = toast.loading('Registering...')
    try {
      await apiHelper.post('/auth/register', { email, password, otp })
      toast.success('Registered successfully', { id: t })
      setOtp('')
      await loginAfterRegister(email, password)
      if (hasGuestSaved) {
        setStep('import')
      } else {
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        navigate('/home')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed'
      toast.error(msg, { id: t })
    }
  }

  const handleImportAll = async () => {
    setImporting(true)
    try {
      const { migrated, foldersCreated } = await migrateGuestSavedToAccount(apiHelper)
      toast.success(`Imported ${foldersCreated} folder(s) and ${migrated} item(s)`)
      await finishImportAndGoHome()
    } catch (err) {
      toast.error(err?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleDontImport = async () => {
    clearGuestSaved()
    toast.success('Account ready. Your local lists were not imported.')
    await finishImportAndGoHome()
  }

  const toggleCustomFolder = (folderId) => {
    setCustomSelectedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const toggleCustomItem = (folderId, itemId) => {
    setCustomSelectedItems((prev) => {
      const set = new Set(prev[folderId] || [])
      if (set.has(itemId)) {
        set.delete(itemId)
      } else {
        set.add(itemId)
      }
      const next = { ...prev }
      if (set.size) next[folderId] = set
      else delete next[folderId]
      return next
    })
  }

  const selectAllInFolder = (folder) => {
    const itemIds = (folder.saved || []).map((s) => s.id)
    setCustomSelectedFolders((prev) => new Set(prev).add(folder.id))
    setCustomSelectedItems((prev) => ({ ...prev, [folder.id]: new Set(itemIds) }))
  }

  const handleCustomImport = async () => {
    const folderIds = Array.from(customSelectedFolders)
    const itemsByFolder = {}
    folderIds.forEach((fid) => {
      const s = customSelectedItems[fid]
      itemsByFolder[fid] = s && s.size ? Array.from(s) : []
    })
    const totalItems = Object.values(itemsByFolder).reduce((sum, arr) => sum + arr.length, 0)
    if (folderIds.length === 0) {
      toast.error('Select at least one folder')
      return
    }
    if (totalItems === 0) {
      toast.error('Select at least one item to import')
      return
    }
    setImporting(true)
    try {
      const { migrated, foldersCreated } = await migrateGuestSavedToAccountCustom(apiHelper, {
        folderIds,
        itemsByFolder,
      })
      toast.success(`Imported ${foldersCreated} folder(s) and ${migrated} item(s)`)
      await finishImportAndGoHome()
    } catch (err) {
      toast.error(err?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!registrationOpen) {
    return <RegistrationClosed logo={logo} />
  }

  if (step === 'import') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl w-full max-w-lg">
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Import your saved lists?</h2>
          <p className="text-gray-400 text-sm mb-6">
            You have {guestData.folders.length} folder(s) with saved items. Choose how to import them to your new account.
          </p>

          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleImportAll}
              disabled={importing}
              className="w-full py-3 px-4 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-400 font-medium hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            >
              Import all — bring all folders and movies into my account
            </button>
            <button
              type="button"
              onClick={handleDontImport}
              disabled={importing}
              className="w-full py-3 px-4 rounded-lg border border-gray-600 bg-gray-700/50 text-gray-200 font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Don&apos;t import — start with an empty list
            </button>
            <div>
              <button
                type="button"
                onClick={() => setImportChoice(importChoice === 'custom' ? null : 'custom')}
                className="w-full py-3 px-4 rounded-lg border border-gray-600 bg-gray-700/50 text-gray-200 font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-left flex items-center justify-between"
              >
                <span>Custom — choose which folders and items to import</span>
                {importChoice === 'custom' ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" aria-hidden /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />}
              </button>

              {importChoice === 'custom' && (
                <div className="mt-3 p-4 rounded-lg bg-gray-900/80 border border-gray-700 max-h-64 overflow-y-auto space-y-3">
                  {guestData.folders.map((folder) => (
                    <div key={folder.id} className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customSelectedFolders.has(folder.id)}
                          onChange={() => toggleCustomFolder(folder.id)}
                          className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="font-medium text-gray-200">{folder.name}</span>
                        <span className="text-gray-500 text-sm">({(folder.saved || []).length} items)</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); selectAllInFolder(folder) }}
                          className="text-xs text-amber-400 hover:underline ml-auto"
                        >
                          Select all
                        </button>
                      </label>
                      <div className="pl-6 space-y-1">
                        {(folder.saved || []).map((item) => (
                          <label key={item.id} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={(customSelectedItems[folder.id] || new Set()).has(item.id)}
                              onChange={() => toggleCustomItem(folder.id, item.id)}
                              className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-gray-300 truncate">{item.title || 'Untitled'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleCustomImport}
                    disabled={importing || customSelectedFolders.size === 0}
                    className="w-full mt-3 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                  >
                    {importing ? 'Importing…' : 'Import selected'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl w-full max-w-sm my-10">
        <div className="flex justify-between">
          <h1 className="text-xl font-semibold mb-4 text-gray-100">Register</h1>
          <img src={logo} alt="Logo" className="w-20" />
        </div>

        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Email"
            />
          </div>

          <div className="mb-4 flex gap-2">
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="flex-1 min-w-0 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="OTP"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpCooldown > 0}
              className="shrink-0 px-4 py-2 rounded bg-gray-600 text-gray-200 font-medium hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {otpCooldown > 0
                ? `${Math.floor(otpCooldown / 60)}:${String(otpCooldown % 60).padStart(2, '0')}`
                : 'Send OTP'}
            </button>
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-3 mb-4 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              className="mt-1 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-400 group-hover:text-gray-300">
              I agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                Terms and Conditions
              </Link>
              {' '}and{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={!agreeToTerms}
            className="w-full bg-amber-500 text-gray-900 py-2 rounded font-medium hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Register
          </button>

          <div className="relative my-4">
            <span className="block text-center text-xs text-gray-500">or</span>
          </div>

          <a
            href={`${baseURL}/auth/google`}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-gray-600 bg-gray-700/50 text-gray-200 font-medium hover:bg-gray-700 hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </a>
        </form>

        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-400 hover:underline font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
