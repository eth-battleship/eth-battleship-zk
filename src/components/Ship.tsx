import React, { useCallback } from 'react'
import { useMemo } from 'react'

import { getShipColor, ShipPosition } from '../lib/game'

interface Props {
  className?: string,
  ship: ShipPosition,
  onPress: (pos: ShipPosition) => {},
  baseSize: number,
}

export const Ship: React.FunctionComponent<Props> = ({ ship, onPress, baseSize, className }) => {
  const color = useMemo(() => getShipColor(ship.length), [ship.length])
  const width = useMemo(() => ship.isVertical ? `${baseSize}rem` : `${baseSize * ship.length}rem`, [baseSize, ship.isVertical, ship.length])
  const height = useMemo(() => (!ship.isVertical) ? `${baseSize}rem` : `${baseSize * ship.length}rem`, [baseSize, ship.isVertical, ship.length])

  const onClick = useCallback(() => onPress(ship), [onPress, ship])

  return (
    <div
      className={className}
      style={{
        backgroundColor: color,
        width,
        height,
      }}
      onClick={onClick}
    />
  )
}

export default Ship
