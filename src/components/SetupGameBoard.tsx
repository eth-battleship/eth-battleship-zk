import styled from '@emotion/styled'
import React, { useCallback, useMemo, useState } from 'react'
import { getShipColor, Position, shipCanBePlaced, ShipConfig } from '../lib/game'
import { flex } from 'emotion-styled-utils'

// import GameBoard from './GameBoard'
import Ship from './Ship'
import GameBoard, { OnCellClickHandler, StyleDecorator } from './GameBoard'
import { useTheme } from '@emotion/react'
import { CssStyle } from './interfaces'

const Container = styled.div`
  ${flex({ direction: 'row', justify: 'center', align: 'center' })};
`

const ShipSelectorContainer = styled.div`
  ${flex({ direction: 'row', justify: 'flex-start', align: 'center', wrap: 'wrap' })};
  margin: 1rem;
  max-width: 200px;

  & > div {
    ${flex({ direction: 'row', justify: 'flex-start', align: 'center' })};
    margin: 1rem;
  }
`

const ShipSelectorShip = styled(Ship)`
  margin-right: 1rem;
  cursor: pointer;
  outline: ${(p: any) => p['data-selected'] ? `4px solid ${p.theme.shipSelector.selectedShip.outlineColor}` : ''};
`

interface Props {
  className?: string,
  boardLength: number,
  shipLengths: number[],
  onChange: (shipPositions: ShipConfig[])=> void,
}

interface ShipSelectorProps {
  ships: ShipConfig[],
  selectedShip?: ShipConfig,
  setSelectedShip: (ship: ShipConfig)=> void,
}

const ShipSelector: React.FunctionComponent<ShipSelectorProps> = ({ ships, selectedShip, setSelectedShip }) => {
  const divs = useMemo(() => {
    const cols: any[] = []

    ships.forEach(ship => {
      const shipH = { ...ship, isVertical: false }
      const shipV = { ...ship, isVertical: true }

      const selectVertical = (selectedShip?.id === ship.id && selectedShip?.isVertical)
      const selectHorizontal = (selectedShip?.id === ship.id && !selectedShip?.isVertical)

      const shipPlaced = shipH.position.x >= 0 || shipV.position.x >= 0

      cols.push(
        <div key={ship.id}>
          <ShipSelectorShip data-selected={selectHorizontal} ship={shipH} onPress={setSelectedShip} blockSize='12px' disabled={shipPlaced}/>
          <ShipSelectorShip data-selected={selectVertical} ship={shipV} onPress={setSelectedShip} blockSize='12px' disabled={shipPlaced}/>
        </div>
      )
    })

    return cols
  }, [selectedShip?.id, selectedShip?.isVertical, setSelectedShip, ships])

  return (
    <ShipSelectorContainer>
      {divs}
    </ShipSelectorContainer>
  )
}

export const SetupGameBoard: React.FunctionComponent<Props> = ({ className, boardLength, shipLengths }) => {
  const theme: any = useTheme()
  
  const [selectedShip, setSelectedShip] = useState<ShipConfig>()
  const [placedShips, setPlacedShips] = useState<Record<number, ShipConfig>>({})

  const ships: ShipConfig[] = useMemo(() => {
    return shipLengths.map((length, index) => {
      // if ship not placed
      if (placedShips[index]) {
        return placedShips[index]
      } else {
        return {
          id: index,
          position: {
            x: -100,
            y: -100,
          },
          length,
          isVertical: false,
        }
      }
    })
  }, [placedShips, shipLengths])

  const onSelectPos: OnCellClickHandler = useCallback((position: Position, shipOnCell?: ShipConfig) => {
    let update 

    if (shipOnCell) {
      delete placedShips[shipOnCell.id]
      update = true
    }

    if (selectedShip) {
      const newShip = {
        ...selectedShip,
        position,
      }

      if (shipCanBePlaced(boardLength, ships, newShip)) {
        placedShips[selectedShip.id] = newShip
        update = true
        setSelectedShip(undefined)
      }
    }

    if (update) {
      setPlacedShips({ ...placedShips })
    }
  }, [boardLength, placedShips, selectedShip, ships])

  const styleDecorator: StyleDecorator = useCallback((cellPos: Position, hover: Position, baseStyles: CssStyle, shipOnCell?: ShipConfig) => {
    // if hovering over this cell
    if (hover.x === cellPos.x && hover.y === cellPos.y) {
      // if ship ready to place and no ship on cell
      if (selectedShip && !shipOnCell) {
        // if ship can be placed there
        if (shipCanBePlaced(boardLength, ships, { ...selectedShip, position: cellPos })) {
          // highlight as potential placing point
          baseStyles.backgroundColor = theme.gameBoard.cell.highlight.bgColor
          baseStyles.cursor = 'pointer'
        } else {
          // disable click
          baseStyles.pointerEvents = 'none'
        }
      }
    } 

    return baseStyles
  }, [boardLength, selectedShip, ships, theme.gameBoard.cell.highlight.bgColor])

  return (
    <Container className={className}>
      <GameBoard 
        boardLength={boardLength} 
        ships={ships} 
        onPress={onSelectPos}       
        styleDecorator={styleDecorator}
      />
      <ShipSelector
        ships={ships}
        selectedShip={selectedShip}
        setSelectedShip={setSelectedShip}
      />
    </Container>
  )
}

export default SetupGameBoard