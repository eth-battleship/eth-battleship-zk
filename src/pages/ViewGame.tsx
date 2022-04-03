import styled from '@emotion/styled'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAsyncEffect  } from 'use-async-effect'

import GameBoard from '../components/GameBoard'
import Layout from '../components/Layout'
import ProgressBox from '../components/ProgressBox'
import { CloudGameWatcher, CloudGameData } from '../contexts'
import { useCloud, useContract, useGame, useGlobal } from '../hooks'
import { GameData, GameState, getPlayerColor, PlayerData } from '../lib/game'

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

const StyledGameBoard = styled(GameBoard)`
  margin: 1.5rem 0;
`

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
          <StyledGameBoard
            boardLength={game.boardLength}
            ships={game.players.length ? game.players[0].ships : []}
          />
        </GameDiv>
      ) : (
        <ProgressBox>Loading game data...</ProgressBox>
      )}
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