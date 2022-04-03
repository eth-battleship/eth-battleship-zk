import styled from '@emotion/styled'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import Layout from '../components/Layout'
import ProgressBox from '../components/ProgressBox'
import { CloudGameWatcher, GameCloudData } from '../contexts'
import { useCloud } from '../hooks'
import { GameState } from '../lib/game'

const Status = styled.div``

const Page: React.FunctionComponent = () => {
  const { gameId } = useParams()
  const { watchGame } = useCloud()
  
  const [watcher, setWatcher] = useState<CloudGameWatcher>()
  const [ game, setGame ] = useState<GameCloudData>()

  useEffect(() => {
    if (watcher && watcher.inputId !== gameId) {
      watcher.unsub()
      setWatcher(undefined)
    }

    setWatcher(watchGame(gameId, setGame))
  }, [gameId, watchGame, watcher])

  const statusText = useMemo(() => {
    switch (game?.status) {
      case GameState.NEED_OPPONENT:
        return 'Awaiting opponent'
      case GameState.PLAYER1_TURN:
        return 'Player 1\'s turn'
      case GameState.PLAYER2_TURN:
        return 'Player 2\'s turn'
      case GameState.REVEAL:
        return 'Calculating winner'
      case GameState.OVER:
        return 'Ended'
    }
  }, [game?.status])

  return (
    <React.Fragment>
      <h1>Game #{gameId}</h1>
      {game ? (
        <div>
          <Status>Status: <em>{statusText}</em></Status>
        </div>
      ) : (
        <ProgressBox>Loading game data...</ProgressBox>
      )}
    </React.Fragment>
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