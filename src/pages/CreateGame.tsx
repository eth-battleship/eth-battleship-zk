import styled from '@emotion/styled'
import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ErrorBox from '../components/ErrorBox'

import Layout from '../components/Layout'
import ProgressTextBox from '../components/ProgressTextBox'
import SetupGameBoard from '../components/SetupGameBoard'
import SuccessBox from '../components/SuccessBox'
import { useContract, useContractFunctionV2, useProgress } from '../hooks'
import { extractNewGameIdFromTxReceipt } from '../lib/contract'
import { Flow } from '../lib/flow'
import { ShipConfig, shipLengthsToBytesHex, shipsToBytesHex } from '../lib/game'

const SHIP_LENGTHS = [5, 4, 3, 3, 2]
const BOARD_LENGTH = 10
const NUM_ROUNDS = 20

const H1 = styled.h1`
  margin-bottom: 2rem;
`

const StyledSetupGameBoard = styled(SetupGameBoard)``

const SubmitButton = styled(Button)`
  margin-bottom: 0.5rem;
`

const CreateGame: React.FunctionComponent = () => {
  const navigate = useNavigate()
  const [ ships, setShips ] = useState<ShipConfig[]>([
    { "id": 0, "position": { "x": 0, "y": 2 }, "length": 5, "isVertical": false }, { "id": 1, "position": { "x": 3, "y": 7 }, "length": 4, "isVertical": true }, { "id": 2, "position": { "x": 3, "y": 1 }, "length": 3, "isVertical": false }, { "id": 3, "position": { "x": 7, "y": 6 }, "length": 3, "isVertical": true }, { "id": 4, "position": { "x": 7, "y": 3 }, "length": 2, "isVertical": false }
  ])

  const contract = useContract()
  const contractCall = useContractFunctionV2({ contract, functionName: 'newGame' })

  const canSubmit = useMemo(() => ships.length === SHIP_LENGTHS.length, [ships.length])

  const progress = useProgress()

  const createGame = useCallback(async () => {
    const flow = new Flow(progress)
    
    let shipsHash: string 
    const shipLengthsHex = shipLengthsToBytesHex(SHIP_LENGTHS)
    const shipsHex = shipsToBytesHex(ships)

    flow.add('Calculate ship hash', async () => {
      shipsHash = await contract.calculateShipsHash( shipLengthsHex, BOARD_LENGTH, shipsHex)
    })

    let newGameId: number = 0

    flow.add('Create game in contract', async () => {
      const receipt = await contractCall.exec(
        shipLengthsHex,
        BOARD_LENGTH,
        NUM_ROUNDS,
        shipsHash
      )

      newGameId = extractNewGameIdFromTxReceipt(receipt)

      console.log(newGameId)
    })

    await flow.run()
  }, [contract, contractCall, progress, ships])

  return (
    <Layout>
      <H1>Create game</H1>
      <p>Place your ships below on the board.</p>
      <StyledSetupGameBoard
        boardLength={BOARD_LENGTH}
        shipLengths={SHIP_LENGTHS}
        onChange={setShips}
      />
      <SubmitButton 
        disabled={!canSubmit || progress.inProgress} 
        onClick={createGame}
      >
        {progress.inProgress ? 'Creating....' : 'Create'}
      </SubmitButton>
      <div>
        {progress.activeStep ? <ProgressTextBox>{(progress.activeStep as string)}</ProgressTextBox> : null}
        {progress.completed ? <SuccessBox>Game created ✅</SuccessBox> : null}
        {progress.error ? (
          <ErrorBox>{progress.error}</ErrorBox>
        ) : null}
      </div>
    </Layout>
  )
}

export default CreateGame