import styled from '@emotion/styled'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAsyncEffect  } from 'use-async-effect'
import Button from '../components/Button'
import ErrorBox from '../components/ErrorBox'

import GameBoard from '../components/GameBoard'
import Layout from '../components/Layout'
import ProgressBox from '../components/ProgressBox'
import SetupGameBoard from '../components/SetupGameBoard'
import SuccessBox from '../components/SuccessBox'
import { CloudGameWatcher, CloudGameData } from '../contexts'
import { useCloud, useContract, useContractFunctionV2, useGame, useGlobal, useProgress } from '../hooks'
import { Flow } from '../lib/flow'
import { GameData, GameState, getPlayerColor, PlayerData, ShipConfig, shipLengthsToBytesHex, shipsToBytesHex } from '../lib/game'

const Container = styled.div`
  h1 {
    margin-top: 0;
  }
`

const GameDiv = styled.div`
  em, strong {
    ${(p: any) => p.theme.font('body', 'bold')}
    margin: 0 0.4em;
  }
`

const Status = styled.div``

const Players = styled.div`
  ${(p: any) => p.theme.font('body', 'normal', 'italic')}
  font-size: 0.8rem;
  margin-bottom: 1rem;
`

const Player = styled.div`
  ${(p: any) => p.theme.font('body', 'normal', 'normal')}
  margin-bottom: 0.2rem;

  strong {
    margin-right: 0.5em;
  }
`

const Player1 = styled(Player)`
  color: ${getPlayerColor(1)}
`

const Player2 = styled(Player)`
  color: ${getPlayerColor(2)}
`

const GameBoardDiv = styled.div`
  margin: 1.5rem 0;
`

const JoinButton = styled(Button)`
  margin-bottom: 0.5rem;
`

interface JoinProps {
  game: CloudGameData,

}
const JoinPlayerBoard: React.FunctionComponent<JoinProps> = ({ game }) => {
  const { joinGame } = useCloud()

  const [ships, setShips] = useState<ShipConfig[]>([
  ])

  console.log(game)

  const shipLengths = useMemo(() => game.players[0].ships.map(({ length }) => length), [game.players])

  const contract = useContract()
  const contractCall = useContractFunctionV2({ contract, functionName: 'join' })

  const canSubmit = useMemo(() => ships.length === shipLengths.length, [shipLengths.length, ships.length])

  const progress = useProgress()

  const join = useCallback(async () => {
    const flow = new Flow(progress)

    let shipsHash: string
    const shipLengthsHex = shipLengthsToBytesHex(shipLengths)
    const shipsHex = shipsToBytesHex(ships)

    flow.add('Calculate ships hash', async () => {
      shipsHash = await contract.calculateShipsHash(shipLengthsHex, game.boardLength, shipsHex)
    })

    flow.add('Join game in contract', async () => {
      await contractCall.exec( game.id, shipsHash )
    })

    flow.add('Updating cloud', async () => {
      await joinGame(game.id, ships)
    })

    await flow.run()
  }, [contract, contractCall, game.boardLength, game.id, joinGame, progress, shipLengths, ships])

  return (
    <React.Fragment>
      <SetupGameBoard
        shipLengths={shipLengths}
        boardLength={game.boardLength}
        onChange={setShips}
      />
      <JoinButton 
        disabled={!canSubmit} 
        loading={progress.inProgress}
        onClick={join}
      >
        Join
      </JoinButton>
      <div>
        {progress.activeStep ? <ProgressBox>{(progress.activeStep as string)}</ProgressBox> : null}
        {progress.completed ? <SuccessBox>Game joined ✅</SuccessBox> : null}
        {progress.error ? (
          <ErrorBox>{progress.error}</ErrorBox>
        ) : null}
      </div>
    </React.Fragment>
  )

}

const Page: React.FunctionComponent = () => {
  const { gameId } = useParams()
  const { game, error, currentUserIsPlayer } = useGame(gameId ? parseInt(gameId) : undefined)

  // rendering stuff....

  const statusText = useMemo(() => {
    switch (game?.status) {
      case GameState.NEED_OPPONENT:
        return 'Awaiting opponent'
      case GameState.PLAYER1_TURN:
        return 'Player 1\'s turn'
      case GameState.PLAYER2_TURN:
        return 'Player 2\'s turn'
      case GameState.REVEAL_BOARD:
        return 'Calculating winner'
      case GameState.ENDED:
        return 'Ended'
    }
  }, [game?.status])

  const currentUserCanJoinAsOpponent = useMemo(() => {
    return game?.status === GameState.NEED_OPPONENT && !currentUserIsPlayer
  }, [currentUserIsPlayer, game?.status])

  return (
    <Container>
      <h1>Game #{gameId}</h1>
      {game ? (
        <GameDiv>
          <Players>
            <Player1>Player1:<strong>{game.player1}</strong>{currentUserIsPlayer === 1 ? '- YOU!' : null}</Player1>
            <Player2>Player2:<strong>{game.player2}</strong>{currentUserIsPlayer === 2 ? '- YOU!' : null}</Player2> 
          </Players>
          <Status>Status:<strong>{statusText}</strong></Status>
          <GameBoardDiv>

          </GameBoardDiv>
          {currentUserCanJoinAsOpponent ? (
            <JoinPlayerBoard game={game} />
          ) : (
            <GameBoard
              boardLength={game.boardLength}
              ships={game.players.length ? game.players[0].ships : []}
            />
          )}
        </GameDiv>
      ) : (
        <ProgressBox>Loading game data...</ProgressBox>
      )}
      {error ? <ErrorBox>{error}</ErrorBox> : null}
    </Container>
  )
}

const ViewGame: React.FunctionComponent = () => {
  return (
    <Layout>
      <Page />
    </Layout>
  )
}

export default ViewGame