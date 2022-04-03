import { hexlify } from '@ethersproject/bytes'

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

export const calculateShipEndPoint = (ship: ShipConfig): Position => {
  const x = ship.position.x + (ship.isVertical ? (ship.length - 1) : 0)
  const y = ship.position.y + (ship.isVertical ? 0 : (ship.length - 1))
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



// See: http://www.cs.swan.ac.uk/~cssimon/line_intersection.html
const linesIntersect = (s1: Position, e1: Position, s2: Position, e2: Position) => {
  const { x: x1, y: y1 } = s1
  const { x: x2, y: y2 } = e1
  const { x: x3, y: y3 } = s2
  const { x: x4, y: y4 } = e2
  /* eslint-disable space-infix-ops */
  /* eslint-disable no-mixed-operators */
  const t1 = ((y3 - y4) * (x1 - x3) + (x4 - x3) * (y1 - y3)) / ((x4 - x3) * (y1 - y2) - (x1 - x2) * (y4 - y3))
  const t2 = ((y1 - y2) * (x1 - x3) + (x2 - x1) * (y1 - y3)) / ((x4 - x3) * (y1 - y2) - (x1 - x2) * (y4 - y3))
  /* eslint-enable space-infix-ops */
  /* eslint-enable no-mixed-operators */

  // if NaN then likely on exact same line segment
  if (Number.isNaN(t1) || Number.isNaN(t2)) {
    // vertical
    if (y1 === y2 && y1 === y3 && y3 === y4) {
      return (!(x3 > x2 || x4 < x1))
    }
    // horizontal
    else if (x1 === x2 && x2 === x3 && x3 === x4) {
      return (!(y3 > y2 || y4 < y1))
    }
  }

  return (0 <= t1 && 1 >= t1 && 0 <= t2 && 1 >= t2)
}


export const shipCanBePlaced = (boardLength: number, existingShips: ShipConfig[], newShip: ShipConfig) => {
  const newShipEndPoint = calculateShipEndPoint(newShip)

  // within board confines?
  if (!(boardLength > newShipEndPoint.x && boardLength > newShipEndPoint.y)) {
    return false
  }

  // clash with existing ships?
  return !Object.values(existingShips).reduce((m, existingShip) => {
    const existingShipEndPoint = calculateShipEndPoint(existingShip)
    return m || linesIntersect(newShip.position, newShipEndPoint, existingShip.position, existingShipEndPoint)
  }, false)
}


export const shipsToBytesHex = (ships: ShipConfig[]): string => {
  const bytes: number[] = []

  ships.forEach(({ position, isVertical }) => {
    bytes.push(position.x, position.y, isVertical ? 1 : 0)
  })

  return hexlify(bytes)
}

export const shipLengthsToBytesHex = (shipLengths: number[]): string => hexlify(shipLengths)

