import { useState, useRef, useCallback, useEffect } from 'react'
import Card from './Card.jsx'

// 8 cat stickers from aCalico24/Calico-Stickers (三花 folder)
const CATS = [
  { id: 1, name: '无语',    src: 'https://raw.githubusercontent.com/aCalico24/Calico-Stickers/main/%E4%B8%89%E8%8A%B1/%E6%97%A0%E8%AF%AD.jpg' },
  { id: 2, name: '豹笑',    src: 'https://raw.githubusercontent.com/aCalico24/Calico-Stickers/main/%E4%B8%89%E8%8A%B1/%E8%B1%B9%E7%AC%91.jpg' },
  { id: 3, name: '问号',    src: 'https://raw.githubusercontent.com/aCalico24/Calico-Stickers/main/%E4%B8%89%E8%8A%B1/%E9%97%AE%E5%8F%B7.jpg' },
  { id: 4, name: '投降',    src: 'https://raw.githubusercontent.com/aCalico24/Calico-Stickers/main/%E4%B8%89%E8%8A%B1/%E6%8A%95%E9%99%8D.png' },
  { id: 5, name: '猫皇帝',  src: 'https://raw.githubusercontent.com/aCalico24/Calico-Stickers/main/%E4%B8%89%E8%8A%B1/%E7%8C%AB%E7%9A%87%E5%B8%9D.jpg' },
  { id: 6, name: '送花',    src: 'https://raw.githubusercontent.com/aCalico24/Calico-Stickers/main/%E4%B8%89%E8%8A%B1/%E9%80%81%E8%8A%B1.jpg' },
  { id: 7, name: '咸鱼',    src: 'https://raw.githubusercontent.com/aCalico24/Calico-Stickers/main/%E4%B8%89%E8%8A%B1/%E6%83%B3%E5%BD%93%E5%92%B8%E9%B1%BC.jpg' },
  { id: 8, name: '名侦探',  src: 'https://raw.githubusercontent.com/aCalico24/Calico-Stickers/main/%E4%B8%89%E8%8A%B1/%E5%90%8D%E4%BE%A6%E6%8E%A2.png' },
]

const MAX_LIVES = 10

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function mkBoard() {
  return shuffle(
    CATS.flatMap(cat => [
      { ...cat, uid: `${cat.id}-a`, flipped: false, matched: false },
      { ...cat, uid: `${cat.id}-b`, flipped: false, matched: false },
    ])
  )
}

// Points per match based on combo count
function calcPoints(combo) {
  return 10 * (1 + Math.floor(combo / 2))
}

export default function App() {
  const [cards, setCards]           = useState(mkBoard)
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

  // Use a ref for click-locking to avoid stale closure issues with rapid clicks
  const lockedRef = useRef(false)

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
            setCards(mkBoard())
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
  }, [cards, sel, over, combo, lives, round])

  const restart = () => {
    lockedRef.current = false
    setCards(mkBoard())
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

  const hearts = Array.from({ length: MAX_LIVES }, (_, i) =>
    i < lives ? '❤️' : '🖤'
  )
  const multiplier = 1 + Math.floor(combo / 2)
  const roundBonus = 30 + round * 10

  return (
    <div className="app">
      <header>
        <h1 className="title">三花翻翻乐</h1>
      </header>

      <div className="hud">
        <div className="hud-block">
          <span className="hud-label">第</span>
          <span className="hud-val round-val">{round}</span>
          <span className="hud-label">关</span>
        </div>
        <div className="hud-divider" />
        <div className="hud-block">
          <span className="hud-label">得分</span>
          <span className="hud-val score-val">{score}</span>
        </div>
        <div className="hud-divider" />
        <div className="hud-block">
          <span className="hud-label">生命</span>
          <div className="lives-rows">
            <div className="lives-row">{hearts.slice(0, 5).join('')}</div>
            <div className="lives-row">{hearts.slice(5).join('')}</div>
          </div>
        </div>
        <div className="hud-divider" />
        <div className="hud-block">
          <span className="hud-label">最高分</span>
          <span className="hud-val hi-val">{hi}</span>
        </div>
      </div>

      <div className="combo-slot">
        {combo >= 2 && !over && !roundClear && (
          <div className="combo-banner" key={combo}>
            {combo} 连击！&nbsp; ×{multiplier} 倍
          </div>
        )}
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
