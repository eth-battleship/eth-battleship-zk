import styled from '@emotion/styled'
import React, { useCallback, useMemo, useState } from 'react'
import { Position, ShipConfig } from '../lib/game'
import { flex } from 'emotion-styled-utils'

// import GameBoard from './GameBoard'
import Ship from './Ship'
import GameBoard from './GameBoard'

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

      cols.push(
        <div key={ship.id}>
          <ShipSelectorShip data-selected={selectHorizontal} ship={shipH} onPress={setSelectedShip} blockSize='12px'/>
          <ShipSelectorShip data-selected={selectVertical} ship={shipV} onPress={setSelectedShip} blockSize='12px'/>
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
  const [selectedShip, setSelectedShip] = useState<ShipConfig>()
  const [placedShips, setShips] = useState<Record<number, ShipConfig>>({})

  const ships: ShipConfig[] = useMemo(() => {
    return shipLengths.map((length, index) => {
      // if ship not placed
      if (placedShips[index]) {
        return placedShips[index]
      } else {
        return {
          id: index,
          position: {
            x: -1,
            y: -1,
          },
          length,
          isVertical: false,
        }
      }
    })
  }, [placedShips, shipLengths])

  const onSelectPos = useCallback((position: Position) => {
    if (selectedShip) {
      placedShips[selectedShip.id] = {
        ...selectedShip,
        position,
      }
    } 
  }, [placedShips, selectedShip])

  return (
    <Container className={className}>
      <GameBoard 
        boardLength={boardLength} 
        ships={ships} 
        onPress={onSelectPos}       
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