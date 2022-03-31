export const getShipColor = (shipSize: number): string => {
  switch (shipSize) {
    case 5: {
      return '#FFC057'
    }
    case 4: {
      return '#0C0CE8'
    }
    case 3: {
      return '#00DAFF'
    }
    case 2: {
      return '#0C0CE8'
    }
    default:
      return 5 < shipSize ? '#EB7FFF' : '#0CE840'
  }
}

export interface Position {
  x: number,
  y: number,
}

export interface ShipPosition {
  xy: Position,
  length: number,
  isVertical: boolean,
}

export const calculateShipEndPoint = (pos: ShipPosition): Position => {
  const x = pos.xy.x + (pos.isVertical ? (pos.length - 1) : 0)
  const y = pos.xy.y + (pos.isVertical ? 0 : (pos.length - 1))
  return { x, y }
}

export const shipSitsOn = (shipPos: ShipPosition, pos: Position) => {
  const { x, y } = pos
  const { x: endX, y: endY } = calculateShipEndPoint(shipPos)
  return (shipPos.xy.x <= x && shipPos.xy.y <= y && endX >= x && endY >= y)
}


export const shipsSitOn = (shipPosArray: ShipPosition[], pos: Position) => (
  Object.values(shipPosArray).reduce((m, shipPos) => (
    m || shipSitsOn(shipPos, pos)
  ), false)
)

