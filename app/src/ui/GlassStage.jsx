import { useDrinkStore, useGlass, useFillRatio, useDrink } from '../store/useDrinkStore.js'
import Glass from './Glass.jsx'
import OverflowDrip from './OverflowDrip.jsx'

// 잔 + 그림자 + 넘침 흐름을 묶은 무대
export default function GlassStage() {
  const glass = useGlass()
  const drink = useDrink()
  const fill = useFillRatio()
  const text = useDrinkStore((s) => s.text)
  const shooting = useDrinkStore((s) => s.shooting)

  const overflow = Math.max(0, text.length - glass.maxChars) / glass.maxChars

  const tilt = shooting ? -68 : 0
  const drainBoost = shooting ? 1 : 0
  const lift = shooting ? -180 : 0

  return (
    <div
      className="absolute left-1/2 top-[44%] pointer-events-none"
      style={{
        zIndex: 2,
        transform: `translate(-50%, calc(-50% + ${lift}px))`,
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.55))',
      }}
    >
      <div className="relative">
        <Glass
          glass={glass}
          fillRatio={Math.min(fill, 1)}
          tilt={tilt}
          drainBoost={drainBoost}
          liquidColor={drink.color}
          liquidEdge={drink.edge}
        />
        {/* 잔 바닥 그림자 (타원) */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: -6,
            width: glass.width * 0.95,
            height: 18,
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 50%, transparent 80%)',
            opacity: shooting ? 0.2 : 0.7,
            transition: 'opacity 0.4s ease',
          }}
        />
      </div>

      <OverflowDrip
        glass={glass}
        overflow={overflow}
        containerWidth={glass.width}
        visible={!shooting}
        liquidColor={drink.color}
        liquidEdge={drink.edge}
      />
    </div>
  )
}
