"use client"

import { useRef, useState } from "react"
import { animate, motion, useAnimate, useMotionValue } from "motion/react"
import "./motion-add-to-basket-utils/index.css"

const TILE = 160
const BASKET = 56
const TILE_TO_BASKET = BASKET / TILE

function wrap(min: number, max: number, value: number) {
  const range = max - min
  return ((((value - min) % range) + range) % range) + min
}
function quadratic(t: number, p0: number, p1: number, p2: number) {
  const rest = 1 - t
  return rest * rest * p0 + 2 * rest * t * p1 + t * t * p2
}
function tangentAngle(t: number, x0: number, cx: number, x1: number, y0: number, cy: number, y1: number) {
  const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx)
  const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy)
  return (Math.atan2(dy, dx) * 180) / Math.PI
}
function controlPoint(x0: number, y0: number, x1: number, y1: number, strength: number, peak: number) {
  const dx = x1 - x0, dy = y1 - y0, length = Math.sqrt(dx * dx + dy * dy)
  return length ? { x: x0 + dx * peak + (-dy / length) * strength * length, y: y0 + dy * peak + (dx / length) * strength * length } : { x: x0, y: y0 }
}
function createArcMixer({ strength = 0.5, peak = 0.5, direction, rotate = false }: { strength?: number; peak?: number; direction?: "cw" | "ccw"; rotate?: boolean | number } = {}) {
  const rotateAmount = rotate === true ? 1 : typeof rotate === "number" ? rotate : 0
  let lastSign: number | undefined
  return (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x, dy = to.y - from.y
    let curve = direction === "cw" ? -strength : direction === "ccw" ? strength : (Math.abs(dx) >= Math.abs(dy) ? dx : dy) < 0 ? -strength : strength
    let ctrl = controlPoint(from.x, from.y, to.x, to.y, curve, peak)
    if (!direction) {
      const vertical = Math.abs(dx) < Math.abs(dy), midX = from.x + dx * peak, midY = from.y + dy * peak
      const sign = Math.sign(vertical ? ctrl.x - midX : ctrl.y - midY)
      if (lastSign !== undefined && sign !== 0 && sign !== lastSign) { curve = -curve; ctrl = controlPoint(from.x, from.y, to.x, to.y, curve, peak) } else if (sign) lastSign = sign
    }
    const startAngle = rotateAmount ? tangentAngle(0, from.x, ctrl.x, to.x, from.y, ctrl.y, to.y) : 0
    const endAngle = rotateAmount ? tangentAngle(1, from.x, ctrl.x, to.x, from.y, ctrl.y, to.y) : 0
    const angleDelta = rotateAmount ? wrap(-180, 180, endAngle - startAngle) : 0
    return (t: number) => {
      const point: { x: number; y: number; rotate?: number } = { x: quadratic(t, from.x, ctrl.x, to.x), y: quadratic(t, from.y, ctrl.y, to.y) }
      if (rotateAmount) { const angle = tangentAngle(t, from.x, ctrl.x, to.x, from.y, ctrl.y, to.y); point.rotate = wrap(-180, 180, angle - (startAngle + angleDelta * t)) * rotateAmount }
      return point
    }
  }
}
function BasketIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 11-1 9" /><path d="m19 11-4-7" /><path d="M2 11h20" /><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" /><path d="M4.5 15.5h15" /><path d="m5 11 4-7" /><path d="m9 11 1 9" /></svg> }

export interface AddToBasketProps { image?: string; name?: string; price?: string | number; onAdd?: () => void; strength?: number; peak?: number; rotate?: number; duration?: number; direction?: "cw" | "ccw" }
export function AddToBasket({ image, name = "Premium Bike Seat Cover", price = "499", onAdd, strength = 0.5, peak = 0.15, rotate = 0.9, duration = 0.45, direction = "cw" }: AddToBasketProps) {
  const [scope, animateElement] = useAnimate(), tileRef = useRef<HTMLDivElement>(null), basketRef = useRef<HTMLDivElement>(null), pingRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false), x = useMotionValue(0), y = useMotionValue(0), rotation = useMotionValue(0), scale = useMotionValue(1), opacity = useMotionValue(1)
  const addToBasket = async () => {
    const tile = tileRef.current, basket = basketRef.current, ping = pingRef.current
    if (!tile || !basket || !ping || busy) return
    setBusy(true); onAdd?.()
    const from = tile.getBoundingClientRect(), to = basket.getBoundingClientRect(), path = createArcMixer({ strength, peak, rotate, direction })({ x: 0, y: 0 }, { x: to.left + to.width / 2 - (from.left + from.width / 2), y: to.top + to.height / 2 - (from.top + from.height / 2) })
    await animate(0, 1, { duration, ease: [0.74, 0.18, 0.93, 0.69], onUpdate: (progress) => { const point = path(progress); x.set(point.x); y.set(point.y); if (point.rotate !== undefined) rotation.set(point.rotate); scale.set(1 + (TILE_TO_BASKET - 1) * progress); opacity.set(progress < 0.95 ? 1 : 1 - (progress - 0.95) / 0.05) } })
    animateElement(basket, { x: 0, y: 0 }, { type: "spring", stiffness: 500, damping: 12 })
    animateElement(ping, { scale: [1, 2.2], opacity: [0.8, 0] }, { duration: 0.5, ease: "easeOut" })
    x.set(0); y.set(0); rotation.set(0); scale.set(0.9); opacity.set(0)
    await animateElement(tile, { opacity: 1, scale: 1 }, { scale: { type: "spring", visualDuration: 0.4, bounce: 0.35 }, opacity: { duration: 0.25, ease: "easeOut" } })
    scale.set(1); opacity.set(1); setBusy(false)
  }
  return <div ref={scope} className="add-to-basket"><div ref={basketRef} className="add-to-basket-cart"><motion.div ref={pingRef} className="add-to-basket-ping" /><BasketIcon /></div><div className="add-to-basket-product"><motion.div ref={tileRef} className="add-to-basket-tile" style={{ x, y, rotate: rotation, scale, opacity }}>{image ? <img src={image} alt="" /> : <span aria-hidden="true">+</span>}</motion.div><div className="add-to-basket-meta"><span className="add-to-basket-name">{name}</span><span className="add-to-basket-price">₹{price}</span></div><motion.button type="button" className="add-to-basket-button" onClick={(event) => { event.stopPropagation(); void addToBasket() }} disabled={busy} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ opacity: busy ? 0.55 : 1 }} aria-label={`Add ${name} to cart`}>Add to cart</motion.button></div></div>
}
export default AddToBasket
