export const getShipColor = (length: number): string => {
  switch (length) {
    case 5: {
      return '#AAE875'
    }
    case 4: {
      return '#FFB3B3'
    }
    case 3: {
      return '#FF5E78'
    }
    case 2: {
      return '#FDFB8A'
    }
    case 1:
    default:
      return '#FFBD80'
  }
}

export interface Position {
  x: number,
  y: number,
}

export interface ShipConfig {
  id: number,
  position: Position,
  length: number,
  isVertical: boolean,
}

export const calculateShipEndPoint = (pos: ShipConfig): Position => {
  const x = pos.position.x + (pos.isVertical ? (pos.length - 1) : 0)
  const y = pos.position.y + (pos.isVertical ? 0 : (pos.length - 1))
  return { x, y }
}

export const shipSitsOn = (shipPos: ShipConfig, pos: Position) => {
  const { x, y } = pos
  const { x: endX, y: endY } = calculateShipEndPoint(shipPos)
  return (shipPos.position.x <= x && shipPos.position.y <= y && endX >= x && endY >= y)
}


export const shipsSitOn = (shipPosArray: ShipConfig[], pos: Position) => (
  Object.values(shipPosArray).reduce((m, shipPos) => (
    m || shipSitsOn(shipPos, pos)
  ), false)
)

