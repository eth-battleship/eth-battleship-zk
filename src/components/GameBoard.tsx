import styled from '@emotion/styled'
import React, { useCallback, useMemo } from 'react'
import { useState } from 'react'

import { Position, ShipPosition, shipSitsOn } from '../lib/game'

const Table = styled.table`
  border: 1px solid ${(p: any) => p.theme.gameBoard.borderColor};
  border-collapse: collapse;
  font-size: 1rem;

  td {
    border: 1px solid ${(p: any) => p.theme.gameBoard.cell.borderColor};
    height: 2em;
    width: 2em;
    text-align: center;
  }
`

interface Props {
  boardLength: number,
  shipPositions: ShipPosition[],
  onPress: (pos: Position) => void,
  styleDecorator?: (cellPos: Position, hover: Position, hasShip: boolean, style: object) => object,
  cellContentRenderer?: (cellPos: Position) => any,
}

interface CellProps extends Props {
  cell: Position,
  hover: Position,
  onHover: (pos: Position) => void,
}


const Cell: React.FunctionComponent<CellProps> = (props) => {
  const { cell, shipPositions, cellContentRenderer, hover, styleDecorator, onPress, onHover } = props

  const activeShip = useMemo(() => {
    return Object.values(shipPositions).find(v => shipSitsOn(v, cell))
  }, [cell, shipPositions])

  const cellPosInActiveShip = useMemo(() => {
    if (!activeShip) {
      return -1
    }
    return (activeShip.isVertical ? (cell.x - activeShip.xy.x) : (cell.y - activeShip.xy.y)) + 1
  }, [activeShip, cell.x, cell.y])

  const style: object = useMemo(() => {
    let style: Record<string, any> = {}

    if (cellPosInActiveShip) {
      switch (cellPosInActiveShip) {
        case 0: {
          style[activeShip?.isVertical ? 'borderBottomWidth' : 'borderRightWidth'] = 0
          break
        }
        case activeShip?.length: {
          style[activeShip?.isVertical ? 'borderTopWidth' : 'borderLeftWidth'] = 0
          break
        }
        default: {
          style[activeShip?.isVertical ? 'borderTopWidth' : 'borderLeftWidth'] = 0
          style[activeShip?.isVertical ? 'borderBottomWidth' : 'borderRightWidth'] = 0
        }
      }
    }

    if (styleDecorator) {
      style = styleDecorator(cell, hover, !!activeShip, style)
    }

    return style
  }, [activeShip, cell, cellPosInActiveShip, hover, styleDecorator])

  const onClick = useCallback(() => onPress(cell), [cell, onPress])
  const onMouseOver = useCallback(() => onHover(cell), [cell, onHover])
  const onMouseOut = useCallback(() => onHover({ x: -1, y: - 1}), [onHover])

  return (
    <td
      style={style}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    >
      {cellContentRenderer ? cellContentRenderer(cell) : null}
    </td>
  )
}

const GameBoard: React.FunctionComponent<Props> = (props) => {
  const { boardLength } = props
  
  const [ hover, setHover ] = useState<Position>({ x: -1, y: -1 })

  const cells = useMemo(() => {
    const rows = []

    for (let x = 0; boardLength > x; x += 1) {
      const row = []

      for (let y = 0; boardLength > y; y += 1) {
        row.push(
          <Cell 
            {...props} 
            key={y} 
            cell={{x, y}} 
            hover={hover}
            onHover={setHover}
          />
        )
      }

      rows.push(
        <tr key={x}>{row}</tr>
      )
    }

    return rows
  }, [boardLength, hover, props])


  return (
    <Table>
      <tbody>
        {cells}
      </tbody>
    </Table>
  )

}

export default GameBoard

