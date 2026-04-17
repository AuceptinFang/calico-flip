import { useState, useRef, useCallback, useEffect } from 'react'
import { FaHeart, FaRegHeart } from 'react-icons/fa'
import Card from './Card.jsx'

const CATS = [
  { id:  1, name: '无语',       src: '/assets/cats/wuyu.jpg' },
  { id:  2, name: '豹笑',       src: '/assets/cats/baoxiao.png' },
  { id:  3, name: '问号',       src: '/assets/cats/wenhao.jpg' },
  { id:  4, name: '问号2',      src: '/assets/cats/wenhao2.jpg' },
  { id:  5, name: '投降',       src: '/assets/cats/touxiang.png' },
  { id:  6, name: '猫皇帝',     src: '/assets/cats/maohuangdi.jpg' },
  { id:  7, name: '猫皇帝无语', src: '/assets/cats/maohuangdi-wuyu.jpg' },
  { id:  8, name: '送花',       src: '/assets/cats/songhua.jpg' },
  { id:  9, name: '咸鱼',       src: '/assets/cats/xianyu.jpg' },
  { id: 10, name: '名侦探',     src: '/assets/cats/mingzhentang.png' },
  { id: 11, name: '初始',       src: '/assets/cats/chushi.jpg' },
  { id: 12, name: '入眠',       src: '/assets/cats/rumian.jpg' },
  { id: 13, name: '大犇',       src: '/assets/cats/daben.jpg' },
  { id: 14, name: '很坏吗',     src: '/assets/cats/henhuaima.jpg' },
  { id: 15, name: '的确坏',     src: '/assets/cats/diquehuai.png' },
  { id: 16, name: '注意坏猫',   src: '/assets/cats/zhuyihuaimao.png' },
  { id: 17, name: '添乱',       src: '/assets/cats/tianluan.jpg' },
  { id: 18, name: '吃白饭',     src: '/assets/cats/chibaifan.png' },
  { id: 19, name: '地铁老猫',   src: '/assets/cats/ditielaomao.jpg' },
  { id: 20, name: '目移',       src: '/assets/cats/muyi.jpg' },
  { id: 21, name: '蒟蒻',       src: '/assets/cats/juuruo.jpg' },
  { id: 22, name: '思维升华1',  src: '/assets/cats/siweishenghua1.jpg' },
  { id: 23, name: '思维升华2',  src: '/assets/cats/siweishenghua2.jpg' },
  { id: 24, name: '何罪之有',   src: '/assets/cats/hezuizhiyou.jpg' },
  { id: 25, name: '命也是命',   src: '/assets/cats/mingyeshiming.jpg' },
  { id: 26, name: '别玩洗衣机', src: '/assets/cats/biewannaxiyijile.jpg' },
  { id: 27, name: '笔自己写',   src: '/assets/cats/bizijixiezuoye.jpg' },
  { id: 28, name: '萝卜纸巾',   src: '/assets/cats/luobozhijin.png' },
  { id: 29, name: '讲坛眯眼',   src: '/assets/cats/yinhuajiangtan-miyan.jpg' },
  { id: 30, name: '讲坛睁眼',   src: '/assets/cats/yinhuajiangtan-zhengyan.jpg' },
  { id: 31, name: 'V50',        src: '/assets/cats/v50.png' },
  { id: 32, name: '自定义文本', src: '/assets/cats/zidingywenben.png' },
]

const MAX_LIVES = 10
const BOARD_PAIRS = 8

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function mkBoard() {
  const picked = shuffle(CATS).slice(0, BOARD_PAIRS)
  return shuffle(
    picked.flatMap(cat => [
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
  const [imagesReady, setImagesReady] = useState(false)
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
  const [scorePopups, setScorePopups] = useState([])

  useEffect(() => {
    let loaded = 0
    CATS.forEach(cat => {
      const img = new Image()
      img.onload = img.onerror = () => {
        loaded++
        if (loaded === CATS.length) setImagesReady(true)
      }
      img.src = cat.src
    })
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
