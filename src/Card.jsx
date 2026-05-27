import { useRef, useEffect, useState } from 'react'

export default function Card({ card, isPeeking, isJustMatched, isJustWrong, onClick }) {
  const { flipped, matched, src, fallbackSrc, name } = card
  const showFront = flipped || matched || isPeeking
  const wrapRef = useRef(null)
  const [imageSrc, setImageSrc] = useState(src)

  useEffect(() => {
    setImageSrc(src)
  }, [src])

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
          <img
            src={imageSrc}
            alt={name}
            draggable="false"
            onError={() => {
              if (fallbackSrc && imageSrc !== fallbackSrc) setImageSrc(fallbackSrc)
            }}
          />
          <span className="cat-label">{name}</span>
        </div>
      </div>
    </div>
  )
}
