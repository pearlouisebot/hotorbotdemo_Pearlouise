import { useEffect, useMemo, useRef, useState } from 'react'
import { demoUserClips, people, type Person } from './data/people'

type VoteStrength = 'clearly' | 'barely'
type Side = 'A' | 'B'
type Tab = 'compare' | 'matches' | 'you'
type ScoreMap = Record<string, number>
type PersonStats = Record<string, { wins: number; losses: number; clearWins: number; barelyWins: number; ratingCount: number; ratingTotal: number }>

type MatchRecord = { personId: string; matchedAtPair: number }
type PersistedState = {
  pairIndex: number
  scores: ScoreMap
  stats: PersonStats
  votes: number
  selections: Record<string, number>
  reactions: Record<string, Record<string, number>>
  matches: MatchRecord[]
}

const STORAGE_KEY = 'hotorbotdemo-state-v1'
const accent = 'bg-accent text-slate-950'
const prompts = Array.from(new Set(people.map((p) => p.prompt)))

const seededState: PersistedState = {
  pairIndex: 0,
  scores: Object.fromEntries(people.map((p, i) => [p.id, 1500 + (i % 7) * 6 - (i % 5) * 4])),
  stats: Object.fromEntries(people.map((p, i) => [p.id, {
    wins: 10 + (i % 9),
    losses: 5 + (i % 7),
    clearWins: 6 + (i % 5),
    barelyWins: 3 + (i % 4),
    ratingCount: 2 + (i % 3),
    ratingTotal: 13 + (i % 11),
  }])),
  votes: 64,
  selections: Object.fromEntries(people.map((p, i) => [p.id, 8 + (i % 9)])),
  reactions: {},
  matches: [{ personId: people[2].id, matchedAtPair: 12 }, { personId: people[11].id, matchedAtPair: 39 }],
}

const buildPairs = () => {
  const pairs: [Person, Person][] = []
  for (let i = 0; i < 52; i += 1) {
    pairs.push([people[(i * 3) % people.length], people[(i * 3 + 11) % people.length]])
  }
  return pairs
}

const PAIRS = buildPairs()
const reactionChips = ['her voice', 'her smile', 'funnier', 'more my type', 'felt real', 'skip']

function readState(): PersistedState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return seededState
  try {
    return { ...seededState, ...JSON.parse(raw) }
  } catch {
    return seededState
  }
}

function saveState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function expected(a: number, b: number) {
  return 1 / (1 + 10 ** ((b - a) / 400))
}

function round(value: number) {
  return Math.round(value)
}

function personStat(state: PersistedState, id: string) {
  return state.stats[id] ?? { wins: 0, losses: 0, clearWins: 0, barelyWins: 0, ratingCount: 0, ratingTotal: 0 }
}

function App() {
  const [tab, setTab] = useState<Tab>('compare')
  const [state, setState] = useState<PersistedState>(() => readState())
  const [showReactionStep, setShowReactionStep] = useState(false)
  const [showRatingStep, setShowRatingStep] = useState(false)
  const [lastWinner, setLastWinner] = useState<Person | null>(null)
  const [fadeKey, setFadeKey] = useState(0)
  const [activeAudio, setActiveAudio] = useState<Side | null>(null)
  const [callMatch, setCallMatch] = useState<MatchRecord | null>(null)
  const [callSeconds, setCallSeconds] = useState(180)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [meetingAnswer, setMeetingAnswer] = useState<string | null>(null)
  const vidA = useRef<HTMLVideoElement | null>(null)
  const vidB = useRef<HTMLVideoElement | null>(null)

  useEffect(() => saveState(state), [state])

  const pair = PAIRS[state.pairIndex % PAIRS.length]
  const currentPrompt = prompts[state.pairIndex % prompts.length]
  const personA = { ...pair[0], prompt: currentPrompt }
  const personB = { ...pair[1], prompt: currentPrompt }

  useEffect(() => {
    setActiveAudio(null)
    if (vidA.current) vidA.current.muted = true
    if (vidB.current) vidB.current.muted = true
  }, [fadeKey])

  useEffect(() => {
    if (!callMatch) return
    const timer = window.setInterval(() => {
      setCallSeconds((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [callMatch])

  const selectedPerson = useMemo(() => {
    if (!callMatch) return null
    return people.find((p) => p.id === callMatch.personId) ?? null
  }, [callMatch])

  const yourStats = useMemo(() => {
    const totalWins = Object.values(state.stats).reduce((sum, stat) => sum + stat.wins, 0)
    const totalLosses = Object.values(state.stats).reduce((sum, stat) => sum + stat.losses, 0)
    const picked = 68
    const wins = totalWins || 1
    const insight = 'You are in the top 20% for your age group in Austin. Keep adding fresh clips to stay competitive.'
    return {
      picked,
      passed: Math.max(0, 100 - picked),
      percentile: 20,
      insight,
      totalWins: wins,
      totalLosses,
    }
  }, [state.stats])

  const matches = state.matches.map((m) => ({ ...m, person: people.find((p) => p.id === m.personId)! }))

  const toggleAudio = (side: Side) => {
    const current = side === 'A' ? vidA.current : vidB.current
    const other = side === 'A' ? vidB.current : vidA.current
    if (!current) return
    const shouldPlayAudio = activeAudio !== side
    current.muted = !shouldPlayAudio
    if (other) other.muted = true
    setActiveAudio(shouldPlayAudio ? side : null)
  }

  const advance = () => {
    setState((prev) => ({ ...prev, pairIndex: (prev.pairIndex + 1) % PAIRS.length }))
    setFadeKey((k) => k + 1)
    setShowReactionStep(false)
    setShowRatingStep(false)
  }

  const recordVote = (winner: Person, loser: Person, strength: VoteStrength) => {
    setLastWinner(winner)
    setState((prev) => {
      const currentWinner = prev.scores[winner.id] ?? 1500
      const currentLoser = prev.scores[loser.id] ?? 1500
      const expWinner = expected(currentWinner, currentLoser)
      const result = strength === 'clearly' ? 1 : 0.6
      const k = 32
      const nextWinner = currentWinner + k * (result - expWinner)
      const nextLoser = currentLoser + k * ((1 - result) - expected(currentLoser, currentWinner))
      const winnerStats = personStat(prev, winner.id)
      const loserStats = personStat(prev, loser.id)
      const shouldMatch = (prev.pairIndex + 1) % 13 === 0
      const matches = shouldMatch && !prev.matches.some((m) => m.personId === winner.id)
        ? [...prev.matches, { personId: winner.id, matchedAtPair: prev.pairIndex + 1 }]
        : prev.matches
      return {
        ...prev,
        votes: prev.votes + 1,
        scores: { ...prev.scores, [winner.id]: nextWinner, [loser.id]: nextLoser },
        selections: { ...prev.selections, [winner.id]: (prev.selections[winner.id] ?? 0) + 1 },
        stats: {
          ...prev.stats,
          [winner.id]: {
            ...winnerStats,
            wins: winnerStats.wins + 1,
            clearWins: winnerStats.clearWins + (strength === 'clearly' ? 1 : 0),
            barelyWins: winnerStats.barelyWins + (strength === 'barely' ? 1 : 0),
          },
          [loser.id]: {
            ...loserStats,
            losses: loserStats.losses + 1,
          },
        },
        matches,
      }
    })

    const voteNumber = state.votes + 1
    if (voteNumber % 10 === 0) {
      setShowRatingStep(true)
      return
    }
    if (voteNumber % 5 === 0) {
      setShowReactionStep(true)
      return
    }
    advance()
  }

  const submitReaction = (chip: string) => {
    if (!lastWinner) return
    setState((prev) => ({
      ...prev,
      reactions: {
        ...prev.reactions,
        [lastWinner.id]: {
          ...(prev.reactions[lastWinner.id] ?? {}),
          [chip]: ((prev.reactions[lastWinner.id] ?? {})[chip] ?? 0) + 1,
        },
      },
    }))
    advance()
  }

  const submitRating = (rating: number) => {
    if (!lastWinner) return
    setState((prev) => {
      const stats = personStat(prev, lastWinner.id)
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [lastWinner.id]: {
            ...stats,
            ratingCount: stats.ratingCount + 1,
            ratingTotal: stats.ratingTotal + rating,
          },
        },
      }
    })
    advance()
  }

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY)
    setState(seededState)
    setTab('compare')
    setShowRatingStep(false)
    setShowReactionStep(false)
    setCallMatch(null)
    setMeetingAnswer(null)
    setFadeKey((k) => k + 1)
  }

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${`${seconds % 60}`.padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-appbg text-white">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-appbg shadow-ios">
        <div className="flex-1 pb-24">
          {tab === 'compare' && !callMatch && (
            <div className="animate-fadeIn px-4 pb-4 pt-4">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-[26px] font-semibold tracking-tight">Who would you rather meet?</h1>
                  <p className="text-[10px] text-muted mt-0.5">_Pearlouise</p>
                  <p className="mt-1 text-sm text-muted">{round((state.pairIndex % 52) + 1)} / 52</p>
                </div>
                <button onClick={() => setPaywallOpen(true)} className="rounded-full border border-border px-3 py-2 text-xs text-muted">
                  7 people picked you ›
                </button>
              </div>

              <div key={fadeKey} className="space-y-3">
                {[personA, personB].map((person, index) => {
                  const side = index === 0 ? 'A' : 'B'
                  const active = activeAudio === side
                  return (
                    <button key={person.id + side} onClick={() => toggleAudio(side)} className="relative block h-[calc((100vh-320px)/2)] min-h-[270px] w-full overflow-hidden rounded-[28px] border border-border bg-panel text-left">
                      <video
                        ref={side === 'A' ? vidA : vidB}
                        src={person.clipUrl}
                        poster={person.posterUrl}
                        muted
                        autoPlay
                        loop
                        playsInline
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent p-4 pt-8">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{person.name}</span>
                          <span className="text-lg text-white/80">{person.age}</span>
                          <span className="ml-auto text-sm font-semibold text-accent">{person.height}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-white/90">{person.profession}</p>
                        <p className="text-xs text-white/60">{person.education}</p>
                        <p className="mt-1.5 text-[10px] text-accent/70">{active ? '🔊 audio on' : 'tap to hear'}</p>
                      </div>
                      <div className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-medium backdrop-blur-sm">{side}</div>
                    </button>
                  )
                })}
              </div>

              {(
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button onClick={() => recordVote(personA, personB, 'clearly')} className={`rounded-[22px] px-4 py-5 text-base font-semibold ${accent}`}>{personA.name}</button>
                  <button onClick={() => recordVote(personB, personA, 'clearly')} className={`rounded-[22px] px-4 py-5 text-base font-semibold ${accent}`}>{personB.name}</button>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between rounded-[24px] border border-border bg-panel px-4 py-3">
                <div>
                  <p className="text-sm font-medium">7 people picked you</p>
                  <p className="text-xs text-muted">See who picked you</p>
                </div>
                <button onClick={() => setPaywallOpen(true)} className="text-sm text-accent underline underline-offset-4">See who</button>
              </div>
            </div>
          )}

          {tab === 'matches' && !callMatch && (
            <div className="px-4 pt-5">
              <h2 className="text-[28px] font-semibold tracking-tight">Matches</h2>
              <p className="mt-1 text-sm text-muted">Mutual picks. Then a three-minute video date scheduled at your convenience.</p>
              <div className="mt-4 space-y-3">
                {matches.map((match) => (
                  <div key={match.personId} className="rounded-[26px] border border-border bg-panel p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold">You both picked each other</p>
                        <p className="mt-1 text-sm text-muted">{match.person.name}, {match.person.age} · {match.person.distance}</p>
                      </div>
                      {match.person.isSynthetic && <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-muted">AI demo profile</span>}
                    </div>
                    <img src={match.person.posterUrl} alt={match.person.name} className="mt-4 h-52 w-full rounded-[22px] object-cover" />
                    <button
                      onClick={() => {
                        setCallMatch(match)
                        setCallSeconds(180)
                        setMeetingAnswer(null)
                      }}
                      className={`mt-4 w-full rounded-[22px] px-4 py-4 text-sm font-semibold ${accent}`}
                    >
                      Schedule 3-minute video date
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {callMatch && selectedPerson && (
            <div className="relative min-h-screen animate-fadeIn bg-black">
              <video src={selectedPerson.clipUrl} poster={selectedPerson.posterUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-80" />
              <div className="relative z-10 flex min-h-screen flex-col justify-between bg-black/35 p-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-accent">Icebreaker</p>
                  <p className="mt-2 text-2xl font-semibold">What is the most irrational opinion you will defend forever?</p>
                </div>
                <div className="space-y-4">
                  <div className="mx-auto w-fit rounded-full bg-black/55 px-5 py-3 text-2xl font-semibold backdrop-blur-sm">{formatTime(callSeconds)}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="rounded-[22px] border border-white/15 bg-black/40 px-4 py-4 text-sm">Mute</button>
                    <button onClick={() => setCallSeconds(0)} className="rounded-[22px] bg-white px-4 py-4 text-sm font-semibold text-black">End</button>
                  </div>
                  {callSeconds === 0 && (
                    <div className="rounded-[24px] border border-white/10 bg-black/55 p-4 backdrop-blur-md">
                      <p className="text-lg font-semibold">Meet in person?</p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <button onClick={() => setMeetingAnswer('yes')} className={`rounded-[22px] px-4 py-4 text-sm font-semibold ${accent}`}>Yes</button>
                        <button onClick={() => setMeetingAnswer('no')} className="rounded-[22px] border border-white/10 bg-black/40 px-4 py-4 text-sm font-semibold">No</button>
                      </div>
                      {meetingAnswer && <button onClick={() => setCallMatch(null)} className="mt-3 w-full text-sm text-accent underline underline-offset-4">Back to matches</button>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'you' && (
            <div className="px-4 pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[28px] font-semibold tracking-tight">Your week</h2>
                  <p className="mt-1 text-sm text-muted">Pre-seeded so the demo feels alive from the first launch.</p>
                </div>
                <button onClick={resetDemo} className="text-xs text-muted underline underline-offset-4">Reset demo</button>
              </div>

              <div className="mt-4 rounded-[28px] border border-border bg-panel p-5">
                <p className="text-[34px] font-semibold">Picked {yourStats.picked}% of the time</p>
                <p className="mt-2 text-sm text-muted">Top {yourStats.percentile}% in Austin, 31-36</p>
                <div className="mt-4 overflow-hidden rounded-full bg-slate-800">
                  <div className="flex h-3 w-full">
                    <div className="bg-accent" style={{ width: `${yourStats.picked}%` }} />
                    <div className="bg-slate-700" style={{ width: `${yourStats.passed}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-xs text-muted">
                  <span>{yourStats.picked}% picked you</span>
                  <span>{yourStats.passed}% passed</span>
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-border bg-panel p-5">
                <p className="text-base font-semibold">Insight</p>
                <p className="mt-2 text-sm text-muted">{yourStats.insight}</p>
              </div>

              <div className="mt-4 space-y-3">
                {demoUserClips.map((clip) => (
                  <div key={clip.id} className="rounded-[26px] border border-border bg-panel p-4">
                    <div className="flex gap-3">
                      <img src={clip.posterUrl} alt={clip.title} className="h-28 w-24 rounded-[20px] object-cover" />
                      <div className="flex-1">
                        <p className="text-lg font-semibold">{clip.title}</p>
                        <p className="mt-2 text-sm text-muted">Picked {clip.seededPickRate}% of the time</p>
                        {clip.seededPickRate < 50 && <p className="mt-4 text-sm text-accent">Try re-recording this one with a faster opening.</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-[24px] border border-border bg-panel px-4 py-4">
                <div>
                  <p className="text-sm font-medium">12 people picked you</p>
                  <p className="text-xs text-muted">See who</p>
                </div>
                <button onClick={() => setPaywallOpen(true)} className="text-sm text-accent underline underline-offset-4">See who</button>
              </div>
            </div>
          )}
        </div>

        {!callMatch && (
          <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-[430px] border-t border-border bg-panel/95 px-4 pb-7 pt-3 backdrop-blur-lg">
            <div className="grid grid-cols-3 gap-2 text-sm">
              {(['compare', 'matches', 'you'] as Tab[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`rounded-[18px] px-3 py-3 capitalize ${tab === item ? `${accent} font-semibold` : 'text-muted'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {paywallOpen && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3">
            <div className="w-full rounded-t-[32px] border border-border bg-panel p-5">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-600" />
              <p className="text-2xl font-semibold">See who picked you</p>
              <p className="mt-2 text-sm text-muted">Unlock the names behind the picks.</p>
              <div className="mt-5 rounded-[24px] border border-border bg-slate-950 p-4">
                <p className="text-sm text-muted">Monthly</p>
                <p className="mt-1 text-3xl font-semibold">$9.99</p>
              </div>
              <button onClick={() => setPaywallOpen(false)} className={`mt-5 w-full rounded-[22px] px-4 py-4 text-sm font-semibold ${accent}`}>Continue</button>
              <button onClick={() => setPaywallOpen(false)} className="mt-3 w-full text-sm text-muted">Not now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
