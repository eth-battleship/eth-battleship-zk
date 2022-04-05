import styled from '@emotion/styled'
import React, { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { flex } from 'emotion-styled-utils'

import Button from '../components/Button'
import ErrorBox from '../components/ErrorBox'
import GameBoard, { CellRendererResult } from '../components/GameBoard'
import Layout from '../components/Layout'
import ProgressBox from '../components/ProgressBox'
import SetupGameBoard from '../components/SetupGameBoard'
import SuccessBox from '../components/SuccessBox'
import { useCloud, useContract, useContractFunctionV2, useGame, useProgress } from '../hooks'
import { Flow } from '../lib/flow'
import { CloudGameData, GameData, GameState, getOpponentNum, getPlayerColor, Position, positionsMatch, ShipConfig, shipLengthsToBytesHex, shipsToBytesHex } from '../lib/game'
import { CssStyle } from '../components/interfaces'

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
  margin-top: 1rem;
`

const JoinButton = styled(Button)`
  margin-bottom: 0.5rem;
`

const PlayerGameBoardsDiv = styled.div`
  ${flex({ direction: 'row', justify: 'flex-start', align: 'flex-start' })};
`

const PlayerGameBoardDiv = styled.div`
  margin-right: 2rem;
`

const BoardTitle = styled.div`
  ${flex({ direction: 'row', justify: 'space-between', align: 'center' })};
  font-size: 0.8rem;

  & > span {
    display: block;
    color: ${(p: any) => getPlayerColor(p['data-player'])};
  }

  & > div {
    ${(p: any) => p.theme.font('body', 'normal', 'italic')}
    color: ${(p: any) => getPlayerColor(p['data-player'] === 1 ? 2 : 1)};
  }
`


const PlayerGameBoard = styled(GameBoard)`
`

interface JoinProps {
  game: GameData,
}

const JoinPlayerBoard: React.FunctionComponent<JoinProps> = ({ game }) => {
  const { joinGame } = useCloud()

  const [ships, setShips] = useState<ShipConfig[]>([])

  const shipLengths = useMemo(() => game.shipLengths, [game.shipLengths])

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

interface PlayerMoveProps {
  hit?: boolean,
}

const PlayerMoveDiv = styled.div`  
  width: 100%;
  height: 100%;
  padding-top: 25%;
  pointer-events: none;
  color: ${(p: any) => p['data-hit'] ? p.theme.gameBoard.cell.hit.color : 'inherit'};
`

const PlayerMove: React.FunctionComponent<PlayerMoveProps> = ({ hit }) => {
  return <PlayerMoveDiv data-hit={hit}>✖</PlayerMoveDiv>
}

const Page: React.FunctionComponent = () => {
  const { gameId } = useParams()
  const { playMove } = useCloud()
  const { game, error, currentUserIsPlayer } = useGame(gameId ? parseInt(gameId) : undefined)

  // rendering stuff....

  const statusText = useMemo(() => {
    switch (game?.status) {
      case GameState.NEED_OPPONENT:
        return 'Awaiting opponent'
      case GameState.PLAYER1_TURN:
        return currentUserIsPlayer === 1 ? 'Your turn' : 'Player 1\'s turn'
      case GameState.PLAYER2_TURN:
        return currentUserIsPlayer === 2 ? 'Your turn' : 'Player 2\'s turn'
      case GameState.REVEAL_BOARD:
        return 'Calculating winner'
      case GameState.ENDED:
        return 'Ended'
    }
  }, [currentUserIsPlayer, game?.status])

  const currentUserCanJoinAsOpponent = useMemo(() => {
    return game?.status === GameState.NEED_OPPONENT && !currentUserIsPlayer
  }, [currentUserIsPlayer, game?.status])

  const currentUserPlayerTurn = useMemo(() => {
    return (game?.status === GameState.PLAYER1_TURN && currentUserIsPlayer === 1)
      || (game?.status === GameState.PLAYER2_TURN && currentUserIsPlayer === 2)
  }, [currentUserIsPlayer, game?.status])

  const onSelectPosHandler = useCallback((cellPos: Position) => {
    playMove(gameId, cellPos)
  }, [gameId, playMove])

  const playerBoardCellRenderer = useCallback((playerNum: number, cellPos: Position, hover: Position, baseStyles: CssStyle) => {
    const ret: CellRendererResult = {
      style: { ...baseStyles }
    }

    const opponentPlayerNum = getOpponentNum(playerNum)

    // display opponent hits
    const moves = game?.players[opponentPlayerNum]?.moves || []
    if (moves.length) {
      const matchIndex = moves.findIndex((pos: Position) => positionsMatch(pos, cellPos))

      if (0 <= matchIndex) {
        const hit = (game?.players[opponentPlayerNum]?.hits || [])[matchIndex]
        ret.content = <PlayerMove hit={hit} />
      }
    }

    // if hovering and not already hit
    if (positionsMatch(cellPos, hover) && !ret.content) {
      // if current user is opponent and it's their turn
      if (currentUserIsPlayer === opponentPlayerNum && currentUserPlayerTurn) {
        // make the cell hittable
        ret.content = <PlayerMove />
        ret.style.cursor = 'pointer'
        ret.style.outline = '4px solid black'
        ret.onPress = onSelectPosHandler
      }
    }

    return ret
  }, [onSelectPosHandler, currentUserIsPlayer, currentUserPlayerTurn, game?.updateCount])

  const player1BoardCellRenderer = useCallback((cellPos: Position, hover: Position, baseStyles: CssStyle) => {
    return playerBoardCellRenderer(1, cellPos, hover, baseStyles)
  }, [playerBoardCellRenderer])

  const player2BoardCellRenderer = useCallback((cellPos: Position, hover: Position, baseStyles: CssStyle) => {
    return playerBoardCellRenderer(2, cellPos, hover, baseStyles)
  }, [playerBoardCellRenderer])

  const player1Hits = useMemo(() => game?.players[1].hits?.reduce((m, v) => m + (v ? 1 : 0), 0), [game?.players])
  const player2Hits = useMemo(() => game?.players[2] ? game?.players[2].hits?.reduce((m, v) => m + (v ? 1 : 0), 0) : 0, [game?.players])

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
            {currentUserCanJoinAsOpponent ? (
              <JoinPlayerBoard game={game} />
            ) : (
              <PlayerGameBoardsDiv>
                <PlayerGameBoardDiv>
                  <BoardTitle data-player={1}>
                    <span>Player 1</span>
                    <div>P2 hits: {player2Hits}</div>
                  </BoardTitle>
                  <PlayerGameBoard
                    boardLength={game.boardLength}
                    ships={game.players[1].ships}
                    cellRenderer={player1BoardCellRenderer}
                  />
                </PlayerGameBoardDiv>
                <PlayerGameBoardDiv>
                  <BoardTitle data-player={2}>
                    <span>Player 2</span>
                    <div>P1 hits: {player1Hits}</div>
                  </BoardTitle>
                  <PlayerGameBoard
                    boardLength={game.boardLength}
                    ships={game.players[2] ? game.players[2].ships : []}
                    cellRenderer={player2BoardCellRenderer}
                  />
                </PlayerGameBoardDiv>
              </PlayerGameBoardsDiv>
            )}
          </GameBoardDiv>
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