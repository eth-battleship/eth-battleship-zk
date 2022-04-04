import { useTheme } from '@emotion/react'
import styled from '@emotion/styled'
import React, { useCallback, useMemo } from 'react'
import { useState } from 'react'

import { Position, ShipConfig, shipSitsOn } from '../lib/game'
import { CssStyle } from './interfaces'

const Table = styled.table`
  border: 1px solid ${(p: any) => p.theme.gameBoard.borderColor};
  border-collapse: collapse;
  font-size: 1rem;

  td {
    border: 1px solid ${(p: any) => p.theme.gameBoard.cell.borderColor};
    height: 2rem;
    width: 2rem;
    text-align: center;
  }
`

export type OnCellClickHandler = (pos: Position, shipOnCell?: ShipConfig) => void

export interface CellRendererResult {
  style: CssStyle,
  onPress?: OnCellClickHandler,
  content?: any,
}

export type CellRenderer = (cellPos: Position, hover: Position, baseStyles: CssStyle, shipOnCell?: ShipConfig) => CellRendererResult

interface Props {
  className?: string,
  boardLength: number,
  ships: ShipConfig[],
  cellRenderer?: CellRenderer,
}

interface CellProps extends Props {
  cell: Position,
  hover: Position,
  onHover: (pos: Position)=> void,
}


const Cell: React.FunctionComponent<CellProps> = (props) => {
  const theme: any = useTheme()
  
  const { cell, ships, cellRenderer, hover, onHover } = props

  const shipOnCell = useMemo(() => {
    return Object.values(ships).find(v => shipSitsOn(v, cell))
  }, [cell, ships])

  const cellPosInshipOnCell = useMemo(() => {
    if (!shipOnCell) {
      return -1
    }
    return (shipOnCell.isVertical ? (cell.x - shipOnCell.position.x) : (cell.y - shipOnCell.position.y)) + 1
  }, [shipOnCell, cell.x, cell.y])

  const baseStyle = useMemo(() => {
    let style: CssStyle = {}

    if (0 <= cellPosInshipOnCell) {
      style.backgroundColor = shipOnCell!.color!
      style.border = `2px solid ${theme.gameBoard.cell.ship.borderColor}`

      switch (cellPosInshipOnCell) {
        case 1: {
          style[shipOnCell!.isVertical ? 'borderBottomWidth' : 'borderRightWidth'] = 1
          break
        }
        case shipOnCell!.length: {
          style[shipOnCell!.isVertical ? 'borderTopWidth' : 'borderLeftWidth'] = 1
          break
        }
        default: {
          style[shipOnCell!.isVertical ? 'borderTopWidth' : 'borderLeftWidth'] = 1
          style[shipOnCell!.isVertical ? 'borderBottomWidth' : 'borderRightWidth'] = 1
        }
      }
    }

    return style
  }, [shipOnCell, cellPosInshipOnCell, theme.gameBoard.cell.ship.borderColor])

  const { content, style, onPress } = useMemo(() => {
    if (cellRenderer) {
      return cellRenderer(cell, hover, baseStyle, shipOnCell)
    } else {
      return {
        style: baseStyle,
      }
    }
  }, [baseStyle, cell, cellRenderer, hover, shipOnCell])

  const onClick = useCallback(() => onPress && onPress(cell, shipOnCell), [shipOnCell, cell, onPress])
  const onMouseOver = useCallback(() => onHover(cell), [cell, onHover])
  const onMouseOut = useCallback(() => { onHover({ x: -1, y: - 1}) }, [onHover])

  return (
    <td
      style={style}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    >
      {content || null}
    </td>
  )
}

const GameBoard: React.FunctionComponent<Props> = ({ className, ...props }) => {
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
    <Table className={className}>
      <tbody>
        {cells}
      </tbody>
    </Table>
  )

}

export default GameBoard

