import { useRef, useEffect } from 'react'

export default function Card({ card, isPeeking, isJustMatched, isJustWrong, onClick }) {
  const { flipped, matched, src, name } = card
  const showFront = flipped || matched || isPeeking
  const wrapRef = useRef(null)

  // Pop animation: fires once when a match is confirmed
  useEffect(() => {
    if (!isJustMatched) return
    const el = wrapRef.current
    if (!el) return
    el.classList.add('pop')
    const remove = () => el.classList.remove('pop')
    el.addEventListener('animationend', remove, { once: true })
    return () => el.removeEventListener('animationend', remove)
  }, [isJustMatched])

  // Shake animation: fires once on a wrong match
  useEffect(() => {
    if (!isJustWrong) return
    const el = wrapRef.current
    if (!el) return
    el.classList.add('shake')
    const remove = () => el.classList.remove('shake')
    el.addEventListener('animationend', remove, { once: true })
    return () => el.removeEventListener('animationend', remove)
  }, [isJustWrong])

  return (
    <div
      ref={wrapRef}
      className={`card-wrap${matched ? ' is-matched' : ''}${isPeeking ? ' is-peeking' : ''}`}
      onClick={onClick}
      role="button"
      aria-label={showFront ? name : '翻牌'}
    >
      <div className={`card${showFront ? ' show-front' : ''}`}>
        {/* Back face */}
        <div className="card-back" />
        {/* Front face */}
        <div className="card-front">
          <img src={src} alt={name} draggable="false" />
          <span className="cat-label">{name}</span>
        </div>
      </div>
    </div>
  )
}
