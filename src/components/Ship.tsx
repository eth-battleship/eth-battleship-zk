import styled from '@emotion/styled'
import React, { useCallback } from 'react'
import { useMemo } from 'react'

import { getShipColor, ShipConfig } from '../lib/game'

const Table = styled.table`
  border: 0;
  border-collapse: collapse;
`

const ShipBlock = styled.td`
  border: 1px solid ${(p: any) => p.theme.ship.block.borderColor};
`

interface Props {
  className?: string,
  ship: ShipConfig,
  onPress: (ship: ShipConfig)=> void,
  blockSize: string,
}

export const Ship: React.FunctionComponent<Props> = ({ ship, onPress, blockSize, className }) => {
  const onClick = useCallback(() => onPress(ship), [onPress, ship])

  const rows = useMemo(() => {
    const cols = []

    for (let i = 0; i < ship.length; i += 1) {
      const shipBlock = (
        <ShipBlock
          key={i}
          style={{
            display: ship.isVertical ? 'block': 'inline-block',
            backgroundColor: getShipColor(ship.length),
            width: blockSize,
            height: blockSize,
          }}
          onClick={onClick}
        />
      )

      cols.push(ship.isVertical ? <tr key={i}>{shipBlock}</tr> : shipBlock)
    }

    return ship.isVertical ? cols : <tr>{cols}</tr>
  }, [blockSize, onClick, ship.isVertical, ship.length])

  return (
    <Table className={className}>
      {rows}
    </Table>
  )
}

export default Ship
