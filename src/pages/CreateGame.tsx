import styled from '@emotion/styled'
import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Button from '../components/Button'
import ErrorBox from '../components/ErrorBox'
import Layout from '../components/Layout'
import ProgressBox from '../components/ProgressBox'
import SetupGameBoard from '../components/SetupGameBoard'
import SuccessBox from '../components/SuccessBox'
import { useCloud, useContract, useContractFunctionV2, useProgress } from '../hooks'
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

const Page: React.FunctionComponent = () => {
  const navigate = useNavigate()

  const { addNewGame } = useCloud()

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

    flow.add('Calculate ships hash', async () => {
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

      console.log(`New game id: ${newGameId}`)
    })

    flow.add('Adding to cloud', async () => {
      await addNewGame(newGameId, BOARD_LENGTH, NUM_ROUNDS, ships)
    })

    flow.add('Navigating to game screen', async () => {
      navigate(`/view/${newGameId}`)
    })

    await flow.run()
  }, [addNewGame, contract, contractCall, navigate, progress, ships])

  return (
    <React.Fragment>
      <H1>Create game</H1>
      <p>Place your ships below on the board.</p>
      <StyledSetupGameBoard
        boardLength={BOARD_LENGTH}
        shipLengths={SHIP_LENGTHS}
        onChange={setShips}
      />
      <SubmitButton 
        disabled={!canSubmit} 
        loading={progress.inProgress}
        onClick={createGame}
      >
        Create
      </SubmitButton>
      <div>
        {progress.activeStep ? <ProgressBox>{(progress.activeStep as string)}</ProgressBox> : null}
        {progress.completed ? <SuccessBox>Game created ✅</SuccessBox> : null}
        {progress.error ? (
          <ErrorBox>{progress.error}</ErrorBox>
        ) : null}
      </div>
    </React.Fragment>
  )
}

const CreateGame: React.FunctionComponent = () => {
  return (
    <Layout>
      <Page />
    </Layout>
  )
}

export default CreateGame