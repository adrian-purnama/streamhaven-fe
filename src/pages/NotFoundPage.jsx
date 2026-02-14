import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, Film, Play, Sparkles } from 'lucide-react'
import { useImage } from '../context/ImageContext'

/* ─── inline keyframes (injected once) ─── */
const STYLE_ID = 'notfound-keyframes'
const KEYFRAMES = `
@keyframes nf-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
@keyframes nf-float-slow{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes nf-float-delay{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes nf-bounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.05)}}
@keyframes nf-spin-slow{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
@keyframes nf-pulse-glow{0%,100%{opacity:.5;filter:blur(20px)}50%{opacity:.9;filter:blur(30px)}}
@keyframes nf-drift{0%{transform:translate(0,0) scale(1);opacity:.7}50%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.4);opacity:0}}
@keyframes nf-blink{0%,48%,52%,100%{transform:scaleY(1)}50%{transform:scaleY(.08)}}
@keyframes nf-wiggle{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes nf-pop{0%{transform:scale(0) translateY(0);opacity:1}100%{transform:scale(1) translateY(var(--py));opacity:0}}
@keyframes nf-filmstrip{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes nf-light-sweep{0%{transform:translateX(-100%) rotate(25deg);opacity:0}30%{opacity:.12}70%{opacity:.12}100%{transform:translateX(200%) rotate(25deg);opacity:0}}
@keyframes nf-ticket{0%,100%{transform:rotate(-6deg) translateY(0)}50%{transform:rotate(-2deg) translateY(-10px)}}
@keyframes nf-soda{0%,100%{transform:rotate(4deg) translateY(0)}50%{transform:rotate(1deg) translateY(-8px)}}
@keyframes nf-headphone-bob{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-4px) rotate(-2deg)}75%{transform:translateY(-4px) rotate(2deg)}}
@keyframes nf-404-glow{0%,100%{text-shadow:0 0 40px rgba(251,191,36,.3),0 0 80px rgba(251,191,36,.15)}50%{text-shadow:0 0 60px rgba(251,191,36,.5),0 0 120px rgba(251,191,36,.25)}}
@keyframes nf-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes nf-wander-x{0%{transform:translateX(0)}25%{transform:translateX(var(--wx1))}50%{transform:translateX(var(--wx2))}75%{transform:translateX(var(--wx3))}100%{transform:translateX(0)}}
@keyframes nf-wander-y{0%{transform:translateY(0) rotate(0)}25%{transform:translateY(var(--wy1)) rotate(var(--wr1))}50%{transform:translateY(var(--wy2)) rotate(var(--wr2))}75%{transform:translateY(var(--wy3)) rotate(var(--wr3))}100%{transform:translateY(0) rotate(0)}}
`

/* ─── deterministic pseudo-random from seed ─── */
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

/* ─── Particle field ─── */
function Particles({ count = 35 }) {
  const [particles] = useState(() => {
    const rand = seededRandom(42)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 100,
      size: 2 + rand() * 4,
      duration: 4 + rand() * 6,
      delay: rand() * 5,
      dx: (rand() - 0.5) * 120,
      dy: -(30 + rand() * 80),
      hue: rand() > 0.5 ? '45' : '280',
    }))
  })

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: `hsl(${p.hue} 90% 70%)`,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            animation: `nf-drift ${p.duration}s ${p.delay}s ease-out infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Popcorn explosion ─── */
function PopcornBurst({ count = 14 }) {
  const [kernels] = useState(() => {
    const rand = seededRandom(99)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (rand() - 0.5) * 200,
      py: -(40 + rand() * 100),
      size: 6 + rand() * 8,
      dur: 1.5 + rand() * 2,
      delay: rand() * 4,
    }))
  })

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {kernels.map((k) => (
        <div
          key={k.id}
          className="absolute left-1/2 bottom-[38%] rounded-full"
          style={{
            width: k.size,
            height: k.size,
            marginLeft: k.x,
            background: `radial-gradient(circle at 35% 35%, #FFF8DC, #F5DEB3 60%, #DEB887)`,
            boxShadow: '0 0 4px rgba(245,222,179,.6)',
            '--py': `${k.py}px`,
            animation: `nf-pop ${k.dur}s ${k.delay}s ease-out infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Film strip ribbon ─── */
function FilmStrip({ className = '', duration = 20 }) {
  const frames = 12
  return (
    <div className={`absolute overflow-hidden pointer-events-none ${className}`} aria-hidden>
      <div
        className="flex"
        style={{ animation: `nf-filmstrip ${duration}s linear infinite`, width: `${frames * 2 * 44}px` }}
      >
        {Array.from({ length: frames * 2 }, (_, i) => (
          <div key={i} className="shrink-0 w-11 h-8 mx-0.5 rounded-sm border border-gray-600/50 bg-gray-800/60 backdrop-blur-sm flex items-center justify-center">
            <div className="w-6 h-5 rounded-[2px] bg-linear-to-br from-amber-500/30 to-purple-500/20" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Holographic play button ─── */
function HoloPlayButton({ className = '', size = 48, delay = 0 }) {
  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={{ animation: `nf-float ${4 + delay}s ${delay}s ease-in-out infinite` }}
      aria-hidden
    >
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, rgba(251,191,36,.3), rgba(168,85,247,.3), rgba(59,130,246,.3), rgba(251,191,36,.3))',
            animation: 'nf-spin-slow 8s linear infinite',
            filter: 'blur(4px)',
          }}
        />
        <div className="absolute inset-1 rounded-full bg-gray-900/80 backdrop-blur-md flex items-center justify-center border border-white/10">
          <Play className="text-amber-400/80" size={size * 0.35} fill="currentColor" />
        </div>
      </div>
    </div>
  )
}

/* ─── Mascot: Popcorn Bucket ─── */
function PopcornMascot() {
  return (
    <div
      className="relative w-24 h-28 sm:w-28 sm:h-32 cursor-pointer group"
      style={{ animation: 'nf-float 5s ease-in-out infinite' }}
      title="I'm lost too!"
    >
      {/* bucket */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-16 sm:h-20 rounded-b-2xl rounded-t-lg bg-linear-to-b from-red-500 to-red-700 border-2 border-red-400/40 shadow-lg shadow-red-900/30 group-hover:scale-105 transition-transform duration-300">
        {/* stripes */}
        <div className="absolute inset-x-0 top-2 h-1 bg-yellow-300/70 rounded-full mx-2" />
        <div className="absolute inset-x-0 top-5 h-1 bg-yellow-300/70 rounded-full mx-2" />
        <div className="absolute inset-x-0 top-8 h-0.5 bg-white/20 rounded-full mx-3" />
        {/* face */}
        <div className="absolute top-10 sm:top-11 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {/* eyes */}
          <div className="w-2.5 h-2.5 rounded-full bg-gray-900 relative">
            <div className="absolute top-0 left-0.5 w-1 h-1 rounded-full bg-white" />
            <div className="absolute inset-0 origin-center" style={{ animation: 'nf-blink 4s ease-in-out infinite' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
            </div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-gray-900 relative">
            <div className="absolute top-0 left-0.5 w-1 h-1 rounded-full bg-white" />
            <div className="absolute inset-0 origin-center" style={{ animation: 'nf-blink 4s .1s ease-in-out infinite' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
            </div>
          </div>
        </div>
        {/* mouth */}
        <div className="absolute top-[3.4rem] sm:top-[3.8rem] left-1/2 -translate-x-1/2 w-3 h-1.5 rounded-b-full bg-gray-900/80" />
      </div>
      {/* popcorn pile on top */}
      {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-0.5" style={{ animation: 'nf-wiggle 3s ease-in-out infinite' }}>
        {[
          { w: 10, h: 11, mt: 0 },
          { w: 12, h: 9, mt: 4 },
          { w: 9, h: 10, mt: 0 },
          { w: 13, h: 12, mt: 4 },
          { w: 11, h: 10, mt: 0 },
        ].map((k, i) => (
          <div
            key={i}
            className="rounded-full shadow-sm"
            style={{
              width: k.w,
              height: k.h,
              background: 'radial-gradient(circle at 35% 35%, #FFFDD0, #F5DEB3 60%, #DEB887)',
              marginTop: k.mt,
            }}
          />
        ))}
      </div> */}
      {/* small arms */}
      <div className="absolute bottom-4 -left-2 w-4 h-1.5 rounded-full bg-red-600 rotate-[-20deg] group-hover:rotate-[-35deg] transition-transform origin-right" />
      <div className="absolute bottom-4 -right-2 w-4 h-1.5 rounded-full bg-red-600 rotate-20 group-hover:rotate-35 transition-transform origin-left" />
    </div>
  )
}

/* ─── Mascot: 3D TV with glasses ─── */
function TvMascot() {
  return (
    <div
      className="relative w-24 h-24 sm:w-28 sm:h-28 cursor-pointer group"
      style={{ animation: 'nf-float-delay 5.5s .5s ease-in-out infinite' }}
      title="Channel not found!"
    >
      {/* TV body */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 sm:w-24 h-16 sm:h-20 rounded-xl bg-linear-to-b from-gray-700 to-gray-800 border-2 border-gray-600/50 shadow-lg shadow-purple-900/20 group-hover:scale-105 transition-transform duration-300">
        {/* screen */}
        <div className="absolute inset-1.5 rounded-lg bg-linear-to-br from-blue-900/80 to-purple-900/80 border border-blue-500/20 overflow-hidden">
          {/* static lines */}
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-px bg-white/5 mt-2" />
          ))}
          {/* face on screen */}
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-1 rounded-b-full bg-cyan-400/60" />
        </div>
      </div>
      {/* glasses */}
      <div className="absolute top-5 sm:top-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5" style={{ animation: 'nf-wiggle 4s ease-in-out infinite' }}>
        <div className="w-5 h-4 rounded-md border-2 border-amber-400/80 bg-amber-900/30" />
        <div className="w-2 h-0.5 bg-amber-400/60" />
        <div className="w-5 h-4 rounded-md border-2 border-amber-400/80 bg-amber-900/30" />
      </div>
      {/* antenna */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-gray-500">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-400 shadow-sm shadow-red-400" style={{ animation: 'nf-pulse-glow 2s ease-in-out infinite' }} />
      </div>
      {/* legs */}
      <div className="absolute bottom-0 left-1/2 -translate-x-[65%] w-1 h-3 bg-gray-600 rounded-b-sm" />
      <div className="absolute bottom-0 left-1/2 translate-x-[45%] w-1 h-3 bg-gray-600 rounded-b-sm" />
    </div>
  )
}

/* ─── Mascot: Alien with headphones ─── */
function AlienMascot() {
  return (
    <div
      className="relative w-20 h-24 sm:w-24 sm:h-28 cursor-pointer group"
      style={{ animation: 'nf-float-slow 6s .3s ease-in-out infinite' }}
      title="Take me to your homepage!"
    >
      {/* body */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 sm:w-14 h-10 sm:h-12 rounded-b-2xl rounded-t-lg bg-linear-to-b from-green-400 to-green-600 border border-green-300/30 shadow-lg shadow-green-900/20 group-hover:scale-105 transition-transform duration-300" />
      {/* head */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-10 sm:h-12 rounded-full bg-linear-to-b from-green-300 to-green-500 border border-green-200/30 shadow-md">
        {/* eyes */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <div className="w-4 h-5 rounded-full bg-gray-900 border border-green-200/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-lime-400 shadow-sm shadow-lime-400">
              <div className="w-0.5 h-0.5 rounded-full bg-white mt-0.5 ml-0.5" />
            </div>
            <div className="absolute inset-0 rounded-full origin-center" style={{ animation: 'nf-blink 5s ease-in-out infinite' }}>
              <div className="w-full h-full rounded-full bg-gray-900" />
            </div>
          </div>
          <div className="w-4 h-5 rounded-full bg-gray-900 border border-green-200/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-lime-400 shadow-sm shadow-lime-400">
              <div className="w-0.5 h-0.5 rounded-full bg-white mt-0.5 ml-0.5" />
            </div>
            <div className="absolute inset-0 rounded-full origin-center" style={{ animation: 'nf-blink 5s .15s ease-in-out infinite' }}>
              <div className="w-full h-full rounded-full bg-gray-900" />
            </div>
          </div>
        </div>
        {/* mouth */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-1 rounded-b-full bg-gray-900/70" />
      </div>
      {/* headphones */}
      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-[4.2rem] sm:w-[4.8rem]" style={{ animation: 'nf-headphone-bob 4s ease-in-out infinite' }}>
        <div className="w-full h-3 rounded-t-full border-t-[3px] border-l-[3px] border-r-[3px] border-gray-400" />
        <div className="absolute -bottom-1.5 left-0 w-3 h-4 rounded-md bg-linear-to-b from-gray-500 to-gray-600 border border-gray-400/40" />
        <div className="absolute -bottom-1.5 right-0 w-3 h-4 rounded-md bg-linear-to-b from-gray-500 to-gray-600 border border-gray-400/40" />
      </div>
      {/* small arms */}
      <div className="absolute bottom-6 -left-0.5 w-3 h-1.5 rounded-full bg-green-500 rotate-[-25deg] group-hover:-rotate-45 transition-transform origin-right" />
      <div className="absolute bottom-6 -right-0.5 w-3 h-1.5 rounded-full bg-green-500 rotate-25 group-hover:rotate-45 transition-transform origin-left" />
    </div>
  )
}

/* ─── Movie Ticket ─── */
function MovieTicket({ className = '' }) {
  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={{ animation: 'nf-ticket 6s ease-in-out infinite' }}
      aria-hidden
    >
      <div className="w-20 h-10 sm:w-24 sm:h-12 bg-linear-to-r from-amber-400 to-amber-500 rounded-lg shadow-lg relative overflow-hidden border border-amber-300/40">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-900" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-900" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] sm:text-[10px] font-bold text-gray-900 tracking-wider">ADMIT ONE</span>
        </div>
        <div className="absolute left-5 top-0 bottom-0 w-px border-l border-dashed border-gray-900/30" />
      </div>
    </div>
  )
}

/* ─── Soda Cup ─── */
function SodaCup({ className = '' }) {
  return (
    <div
      className={`absolute pointer-events-none ${className}`}
      style={{ animation: 'nf-soda 5s .8s ease-in-out infinite' }}
      aria-hidden
    >
      <div className="relative w-8 h-14 sm:w-10 sm:h-16">
        {/* cup body */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 sm:w-9 h-10 sm:h-12 bg-linear-to-b from-blue-400 to-blue-600 rounded-b-lg border border-blue-300/30 shadow-md">
          {/* label */}
          <div className="absolute top-2 inset-x-1 h-3 bg-white/20 rounded-sm flex items-center justify-center">
            <span className="text-[5px] font-bold text-white/80">SODA</span>
          </div>
        </div>
        {/* lid */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 sm:w-10 h-2 bg-linear-to-b from-red-400 to-red-500 rounded-t-md border border-red-300/30" />
        {/* straw */}
        <div className="absolute top-0 left-[60%] w-0.5 h-5 bg-red-300 rotate-[8deg]" />
      </div>
    </div>
  )
}

/* ─── Floating logos that drift lazily ─── */
const LOGO_INSTANCES = [
  { left: '8%',  top: '14%', size: 40, opacity: 0.12, durX: 18, durY: 22, wx: [60, -40, 30],   wy: [30, -50, 20],   wr: [8, -5, 10]   },
  { left: '78%', top: '10%', size: 52, opacity: 0.09, durX: 24, durY: 16, wx: [-50, 35, -25],  wy: [-30, 40, -20],  wr: [-6, 8, -10]  },
  { left: '85%', top: '65%', size: 36, opacity: 0.10, durX: 20, durY: 26, wx: [40, -60, 20],   wy: [45, -25, 35],   wr: [12, -8, 5]   },
  { left: '15%', top: '70%', size: 44, opacity: 0.08, durX: 22, durY: 18, wx: [-35, 50, -45],  wy: [-20, 55, -30],  wr: [-10, 6, -4]  },
  { left: '50%', top: '5%',  size: 32, opacity: 0.07, durX: 26, durY: 20, wx: [25, -30, 45],   wy: [35, -40, 15],   wr: [5, -12, 8]   },
  { left: '3%',  top: '42%', size: 28, opacity: 0.10, durX: 21, durY: 25, wx: [45, -20, 55],   wy: [-35, 25, -45],  wr: [7, -10, 3]   },
  { left: '92%', top: '38%', size: 46, opacity: 0.08, durX: 19, durY: 23, wx: [-55, 40, -30],  wy: [20, -45, 30],   wr: [-9, 5, -7]   },
  { left: '35%', top: '80%', size: 34, opacity: 0.11, durX: 25, durY: 17, wx: [30, -50, 40],   wy: [50, -20, 40],   wr: [4, -8, 12]   },
  { left: '62%', top: '75%', size: 38, opacity: 0.07, durX: 23, durY: 19, wx: [-40, 55, -35],  wy: [-25, 50, -15],  wr: [-11, 7, -3]  },
  { left: '45%', top: '30%', size: 24, opacity: 0.06, durX: 28, durY: 21, wx: [20, -35, 25],   wy: [40, -30, 20],   wr: [6, -4, 9]    },
  { left: '25%', top: '88%', size: 30, opacity: 0.09, durX: 17, durY: 24, wx: [-25, 45, -50],  wy: [-40, 20, -35],  wr: [-5, 11, -8]  },
  { left: '70%', top: '2%',  size: 42, opacity: 0.08, durX: 22, durY: 27, wx: [50, -45, 35],   wy: [25, -55, 30],   wr: [10, -6, 4]   },
  { left: '55%', top: '50%', size: 20, opacity: 0.05, durX: 30, durY: 15, wx: [-30, 25, -40],  wy: [-15, 35, -25],  wr: [-3, 9, -6]   },
  { left: '18%', top: '25%', size: 48, opacity: 0.07, durX: 16, durY: 28, wx: [35, -55, 45],   wy: [55, -35, 45],   wr: [8, -11, 6]   },
]

function FloatingLogos({ logo }) {
  return (
    <>
      {LOGO_INSTANCES.map((inst, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: inst.left,
            top: inst.top,
            '--wx1': `${inst.wx[0]}px`, '--wx2': `${inst.wx[1]}px`, '--wx3': `${inst.wx[2]}px`,
            animation: `nf-wander-x ${inst.durX}s ease-in-out infinite`,
          }}
          aria-hidden
        >
          <div
            style={{
              '--wy1': `${inst.wy[0]}px`, '--wy2': `${inst.wy[1]}px`, '--wy3': `${inst.wy[2]}px`,
              '--wr1': `${inst.wr[0]}deg`, '--wr2': `${inst.wr[1]}deg`, '--wr3': `${inst.wr[2]}deg`,
              animation: `nf-wander-y ${inst.durY}s ease-in-out infinite`,
            }}
          >
            <img
              src={logo}
              alt=""
              className="select-none"
              draggable={false}
              style={{
                width: inst.size,
                height: inst.size,
                objectFit: 'contain',
                opacity: inst.opacity,
                filter: 'grayscale(.3) brightness(1.5)',
              }}
            />
          </div>
        </div>
      ))}
    </>
  )
}

/* ─── Volumetric light beam ─── */
function LightBeam({ className = '', rotate = 25 }) {
  return (
    <div className={`absolute pointer-events-none overflow-hidden ${className}`} aria-hidden>
      <div
        className="w-40 h-[500px] opacity-[.07]"
        style={{
          background: 'linear-gradient(180deg, rgba(251,191,36,.8) 0%, transparent 100%)',
          transform: `rotate(${rotate}deg)`,
          filter: 'blur(20px)',
        }}
      />
    </div>
  )
}

/* ─── MAIN PAGE ─── */
export default function NotFoundPage() {
  const { logo } = useImage()
  const containerRef = useRef(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  /* inject keyframes */
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = KEYFRAMES
      document.head.appendChild(style)
    }
    return () => {
      const el = document.getElementById(STYLE_ID)
      if (el) el.remove()
    }
  }, [])

  /* parallax */
  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const { left, top, width, height } = containerRef.current.getBoundingClientRect()
    setMouse({
      x: ((e.clientX - left) / width - 0.5) * 2,
      y: ((e.clientY - top) / height - 0.5) * 2,
    })
  }

  const px = (factor) => `translate(${mouse.x * factor}px, ${mouse.y * factor}px)`

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[calc(100vh-64px)] overflow-hidden flex items-center justify-center bg-gray-950 selection:bg-amber-500/30"
    >
      {/* ── background layers ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,50,200,.12)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(251,191,36,.06)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(59,130,246,.06)_0%,transparent_50%)]" />

      {/* floating logos */}
      <FloatingLogos logo={logo} />

      {/* volumetric lights */}
      <LightBeam className="top-0 left-[10%]" rotate={15} />
      <LightBeam className="top-0 right-[15%]" rotate={-20} />

      {/* particles */}
      <Particles />
      <PopcornBurst />

      {/* film strips */}
      <div style={{ transform: px(3) }}>
        <FilmStrip className="top-8 -left-10 h-8 w-[600px] rotate-[-8deg] opacity-40" duration={25} />
        <FilmStrip className="bottom-12 -right-10 h-8 w-[500px] rotate-6 opacity-30" duration={30} />
      </div>

      {/* holographic play buttons */}
      <div style={{ transform: px(8) }}>
        <HoloPlayButton className="top-[15%] left-[8%] hidden sm:block" size={52} delay={0} />
        <HoloPlayButton className="top-[25%] right-[10%] hidden sm:block" size={38} delay={1.5} />
        <HoloPlayButton className="bottom-[20%] left-[15%] hidden sm:block" size={32} delay={2.5} />
        <HoloPlayButton className="bottom-[30%] right-[6%] hidden lg:block" size={44} delay={0.8} />
      </div>

      {/* decorative props */}
      <div style={{ transform: px(6) }}>
        <MovieTicket className="top-[18%] right-[18%] hidden sm:block" />
        <MovieTicket className="bottom-[22%] left-[10%] hidden md:block" />
        <SodaCup className="top-[12%] left-[20%] hidden sm:block" />
        <SodaCup className="bottom-[15%] right-[18%] hidden md:block" />
      </div>

      {/* light sweep */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute top-0 left-0 w-[200px] h-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent)',
            animation: 'nf-light-sweep 8s 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── main content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 max-w-3xl mx-auto" style={{ transform: px(2) }}>

        {/* mascot row */}
        <div className="flex items-end justify-center gap-4 sm:gap-8 mb-6 sm:mb-8" style={{ transform: px(5) }}>
          <AlienMascot />
          <PopcornMascot />
          <TvMascot />
        </div>

        {/* 404 */}
        <h1
          className="text-[6rem] sm:text-[8rem] lg:text-[10rem] font-black leading-none tracking-tighter select-none"
          style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #d97706 50%, #fbbf24 75%, #f59e0b 100%)',
            backgroundSize: '400% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'nf-shimmer 4s linear infinite, nf-404-glow 3s ease-in-out infinite',
            filter: 'drop-shadow(0 4px 24px rgba(251,191,36,.3))',
          }}
        >
          404
        </h1>

        {/* subtitle */}
        <p className="mt-2 text-lg sm:text-xl lg:text-2xl font-semibold text-gray-200 max-w-lg leading-relaxed">
          Oops&hellip; This page got lost in the Stream!
        </p>
        <p className="mt-2 text-sm sm:text-base text-gray-400 max-w-md">
          The scene you&apos;re looking for may have been moved, deleted, or maybe it never existed in this universe.
        </p>

        {/* sparkle divider */}
        <div className="flex items-center gap-2 mt-6 mb-6 text-amber-500/50">
          <div className="w-12 h-px bg-linear-to-r from-transparent to-amber-500/40" />
          <Sparkles size={16} />
          <div className="w-12 h-px bg-linear-to-l from-transparent to-amber-500/40" />
        </div>

        {/* buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <Link
            to="/"
            className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-linear-to-r from-amber-500 to-amber-400 text-gray-900 font-bold text-sm sm:text-base shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.04] active:scale-[0.98] transition-all duration-200 overflow-hidden"
          >
            <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <Home size={18} className="relative z-10" />
            <span className="relative z-10">Back Home</span>
          </Link>
          <Link
            to="/discover"
            className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl border-2 border-gray-600 bg-gray-800/60 backdrop-blur-md text-gray-200 font-bold text-sm sm:text-base hover:border-amber-500/50 hover:bg-gray-800/80 hover:text-amber-400 hover:scale-[1.04] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-gray-900/30 overflow-hidden"
          >
            <span className="absolute inset-0 bg-linear-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <Film size={18} className="relative z-10" />
            <span className="relative z-10">Browse Movies</span>
          </Link>
        </div>
      </div>

      {/* bottom gradient fade */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-linear-to-t from-gray-950 to-transparent pointer-events-none" />
    </div>
  )
}
