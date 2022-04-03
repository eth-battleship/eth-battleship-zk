import styled from '@emotion/styled'
import React, { useCallback } from 'react'
import { useMemo } from 'react'

import { ShipConfig } from '../lib/game'

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
  disabled?: boolean,
  onPress: (ship: ShipConfig)=> void,
  blockSize: string,
}

export const Ship: React.FunctionComponent<Props> = ({ ship, onPress, blockSize, className, disabled }) => {
  const onClick = useCallback(() => disabled ? null : onPress(ship), [disabled, onPress, ship])

  const rows = useMemo(() => {
    const cols = []

    for (let i = 0; i < ship.length; i += 1) {
      const shipBlock = (
        <ShipBlock
          key={i}
          style={{
            display: ship.isVertical ? 'block': 'inline-block',
            backgroundColor: ship.color,
            width: blockSize,
            height: blockSize,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? '0.1' : '1',
          }}
          onClick={onClick}
        />
      )

      cols.push(ship.isVertical ? <tr key={i}>{shipBlock}</tr> : shipBlock)
    }

    return ship.isVertical ? cols : <tr>{cols}</tr>
  }, [blockSize, disabled, onClick, ship.color, ship.isVertical, ship.length])

  return (
    <Table className={className}>
      {rows}
    </Table>
  )
}

export default Ship
