import { useState, useRef, useCallback, useEffect } from 'react'
import { FaHeart, FaRegHeart } from 'react-icons/fa'
import Card from './Card.jsx'
import {
  MAX_LIVES,
  calcPoints,
  createBoard,
  loadCatalog,
} from './catalog.js'

export default function App() {
  const [imagesReady, setImagesReady] = useState(false)
  const [catalog, setCatalog]       = useState([])
  const [cards, setCards]           = useState([])
  const [sel, setSel]               = useState([])        // indices of currently selected cards
  const [score, setScore]           = useState(0)
  const [lives, setLives]           = useState(MAX_LIVES)
  const [combo, setCombo]           = useState(0)
  const [round, setRound]           = useState(1)
  const [over, setOver]             = useState(false)
  const [roundClear, setRoundClear] = useState(false)
  const [peekUid, setPeekUid]       = useState(null)
  const [justMatched, setJustMatched] = useState([])
  const [justWrong, setJustWrong]   = useState([])
  const [hi, setHi]                 = useState(() => +localStorage.getItem('calico-hi') || 0)
  const [scorePopups, setScorePopups] = useState([])

  useEffect(() => {
    let cancelled = false

    loadCatalog().then(cats => {
      if (cancelled) return
      setCatalog(cats)
      setCards(createBoard(cats))
      setImagesReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  // Use a ref for click-locking to avoid stale closure issues with rapid clicks
  const lockedRef   = useRef(false)
  const popupIdRef  = useRef(0)

  // Keep high score in sync
  useEffect(() => {
    if (score > hi) {
      setHi(score)
      localStorage.setItem('calico-hi', String(score))
    }
  }, [score]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = useCallback((idx) => {
    if (lockedRef.current || over) return
    const card = cards[idx]
    if (card.flipped || card.matched) return
    if (sel.length >= 2) return

    // Flip this card
    const next = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c)
    setCards(next)
    const newSel = [...sel, idx]
    setSel(newSel)

    if (newSel.length < 2) return

    // --- Two cards are now selected ---
    lockedRef.current = true
    const [i1, i2] = newSel
    const c1 = next[i1]
    const c2 = next[i2]

    if (c1.id === c2.id) {
      // *** MATCH ***
      const newCombo = combo + 1
      const pts = calcPoints(newCombo)

      setTimeout(() => {
          const matched = next.map((c, i) =>
            i === i1 || i === i2 ? { ...c, matched: true, flipped: true } : c
          )
        setCards(matched)
        setScore(s => s + pts)
        setCombo(newCombo)
        const pid = ++popupIdRef.current
        setScorePopups(ps => [...ps, { id: pid, pts }])
        setTimeout(() => setScorePopups(ps => ps.filter(p => p.id !== pid)), 900)
        setSel([])
        setJustMatched([c1.uid, c2.uid])
        setTimeout(() => setJustMatched([]), 600)

        // Wild Cat Peek: reveal a random unmatched card for 1.8s every 3rd consecutive match
        if (newCombo > 0 && newCombo % 3 === 0) {
          const unmatched = matched.filter(c => !c.matched)
          if (unmatched.length > 0) {
            const lucky = unmatched[Math.floor(Math.random() * unmatched.length)]
            setPeekUid(lucky.uid)
            setTimeout(() => setPeekUid(null), 1800)
          }
        }

        // Win condition
        if (matched.every(c => c.matched)) {
          setRoundClear(true)
          const bonus = 30 + round * 10
          setTimeout(() => {
            setRoundClear(false)
            setRound(r => r + 1)
            setScore(s => s + bonus)
            setLives(MAX_LIVES)
            setCards(createBoard(catalog))
            setCombo(0)
            lockedRef.current = false
          }, 1400)
        } else {
          lockedRef.current = false
        }
      }, 500)
    } else {
      // *** WRONG MATCH ***
      setJustWrong([c1.uid, c2.uid])

      setTimeout(() => {
        setJustWrong([])
        setSel([])
        setCombo(0)
        const newLives = lives - 1

        if (newLives <= 0) {
          setLives(0)
          setOver(true)
          lockedRef.current = false
        } else {
          setLives(newLives)
          setCards(next.map((c, i) =>
            i === i1 || i === i2 ? { ...c, flipped: false } : c
          ))
          lockedRef.current = false
        }
      }, 950)
    }
  }, [cards, sel, over, combo, lives, round, catalog])

  const restart = () => {
    lockedRef.current = false
    setCards(createBoard(catalog))
    setSel([])
    setScore(0)
    setLives(MAX_LIVES)
    setCombo(0)
    setRound(1)
    setOver(false)
    setRoundClear(false)
    setPeekUid(null)
    setJustMatched([])
    setJustWrong([])
  }

  const roundBonus = 30 + round * 10

  if (!imagesReady) {
    return (
      <div className="app loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">加载中…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1 className="title">三花翻翻乐</h1>
        <p className="subtitle">猫猫素材来自 <a href="https://github.com/aCalico24/Calico-Stickers" target="_blank" rel="noreferrer" style={{color:'inherit'}}>aCalico24/Calico-Stickers</a></p>
        <p className="subtitle">本仓库地址<a href="https://github.com/luisleee/calico-flip" target="_blank" rel="noreferrer" style={{color:'inherit'}}>luisleee/calico-flip</a></p>
      </header>

      <div className="hud">
        <div className="hud-block">
          <span className="hud-label">第</span>
          <span className="hud-val round-val">{round}</span>
          <span className="hud-label">关</span>
        </div>
        <div className="hud-divider" />
        <div className="hud-block score-block">
          <span className="hud-label">得分</span>
          <span className="hud-val score-val">{score}</span>
          {scorePopups.map(p => (
            <span key={p.id} className="score-popup">+{p.pts}</span>
          ))}
        </div>
        <div className="hud-divider" />
        <div className="hud-block">
          <span className="hud-label">生命</span>
          <div className="lives-rows">
            <div className="lives-row">
              {Array.from({ length: 5 }, (_, i) =>
                i < lives ? <FaHeart key={i} className="life-icon life-icon--on" /> : <FaRegHeart key={i} className="life-icon" />
              )}
            </div>
            <div className="lives-row">
              {Array.from({ length: 5 }, (_, i) =>
                i + 5 < lives ? <FaHeart key={i} className="life-icon life-icon--on" /> : <FaRegHeart key={i} className="life-icon" />
              )}
            </div>
          </div>
        </div>
        <div className="hud-divider" />
        <div className="hud-block">
          <span className="hud-label">最高分</span>
          <span className="hud-val hi-val">{hi}</span>
        </div>
      </div>


      <div className="grid">
        {cards.map((card, idx) => (
          <Card
            key={card.uid}
            card={card}
            isPeeking={peekUid === card.uid}
            isJustMatched={justMatched.includes(card.uid)}
            isJustWrong={justWrong.includes(card.uid)}
            onClick={() => handleClick(idx)}
          />
        ))}
      </div>

      {roundClear && (
        <div className="overlay clear-overlay">
          <div className="clear-panel">
            <div className="clear-title">第 {round} 关通过！</div>
            <div className="clear-bonus">+{roundBonus} 分</div>
          </div>
        </div>
      )}

      {over && (
        <div className="overlay gameover-overlay">
          <div className="gameover-panel">
            <div className="gameover-title">游戏结束</div>
            {score > 0 && score >= hi && (
              <div className="new-record">🎉 新纪录！</div>
            )}
            <div className="score-row">
              <span>得分</span>
              <strong className="final-score">{score}</strong>
            </div>
            <div className="score-row">
              <span>最高分</span>
              <strong>{hi}</strong>
            </div>
            <button className="restart-btn" onClick={restart}>
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
