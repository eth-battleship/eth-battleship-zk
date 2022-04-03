import { useCallback, useEffect, useMemo, useState } from "react"

import { useAsyncEffect } from 'use-async-effect'
import { CloudGameData, CloudGameWatcher } from "../contexts"
import { applyColorsToShips, GameData, GameState, PlayerData } from "../lib/game"
import { ADDRESS_ZERO } from "../lib/utils"
import { useCloud, useGlobal } from "./contexts"
import { useContract } from "./contract"

export interface UseGameHook {
  game: CloudGameData | undefined,
  currentUserIsPlayer?: number,
  error?: string,
}

/**
 * Asynchronous action progress indicator.
 */
export const useGame = (gameId?: number): UseGameHook => {
  const { watchGame, loadPlayerData } = useCloud()
  const { account } = useGlobal()
  const [watcher, setWatcher] = useState<CloudGameWatcher>()
  const [cloudGameData, setCloudGameData] = useState<CloudGameData>()
  const [cloudPlayerData, setCloudPlayerData] = useState<PlayerData>()
  const [contractGameData, setContractGameData] = useState<GameData>()
  const [error, setError] = useState<string>()

  // when cloud game data gets updated
  const onUpdateCloudGame = useCallback(async (g: CloudGameData) => {
    if (!cloudGameData || g.updateCount > cloudGameData.updateCount) {
      setCloudGameData(g)
    }
  }, [cloudGameData])

  // load cloud player data
  useEffect(() => {    
    // dont repeat work
    if (gameId && !cloudPlayerData) {
      loadPlayerData(gameId).then(data => {
        if (data) {
          setCloudPlayerData(data)
        }
      })
    }
  }, [cloudPlayerData, gameId, loadPlayerData])

  // load cloud game data
  useEffect(() => {
    if (!watcher || watcher.inputId !== gameId) {
      if (watcher) {
        watcher.unsub()
        setWatcher(undefined)
      }

      setCloudGameData(undefined)

      if (gameId) {
        setWatcher(watchGame(gameId, onUpdateCloudGame))
      }
    }
  }, [gameId, onUpdateCloudGame, watchGame, watcher])

  // load contract game data
  const contract = useContract()

  useAsyncEffect(async () => {
    try {
      // dont repeat work
      if (contractGameData?.id === gameId) {
        return
      }
      
      setContractGameData(undefined)

      if (!gameId) {
        return
      }

      const d = await contract.games(gameId)

      const obj: GameData = {
        id: gameId,
        totalRounds: d.numRounds.toNumber(),
        player1: d.player1,
        player2: d.player2 !== ADDRESS_ZERO ? d.player2 : undefined,
        boardLength: d.boardSize.toNumber(),
        status: GameState.UNKNOWN,
        players: [],
      }

  //     switch (d.state) {
  //       case 0:
  //         obj.status = GameState.NEED_OPPONENT
  //         break
  //       case 2:
  //         obj.status = GameState.REVEAL_BOARD
  //         break
  //       case 3:
  //         obj.status = GameState.ENDED
  //         obj.winner = d.winner
  //         break
  //       default:
  //         // nothing
  //     }

  //     // load player1 data
  //     const pd = await contract.players(gameId, obj.player1)
  //     obj.players.push({
  //       gameId,
  //       player: obj.player1,
  //       ships: 
  //     })

      setContractGameData(obj)
    } catch (err: any) {
      setError(`Error loading game info from contract: ${err.toString()}`)
    }
  }, [contract, gameId])

  // combine both sets of data
  const game = useMemo(() => {
    if (cloudGameData && contractGameData) {
      return {
        ...contractGameData,
        ...cloudGameData,
      }
    } else {
      return undefined
    }
  }, [cloudGameData, contractGameData])

  const currentUserIsPlayer = useMemo(() => {
    if (account === game?.player1) {
      return 1
    } else if (account === game?.player2) {
      return 2
    } else {
      return 0
    }
  }, [account, game?.player1, game?.player2])

  const gameWithPlayers = useMemo(() => {
    if (game && cloudPlayerData) {
      if (currentUserIsPlayer === 1) {
        const pd = {
          ...cloudPlayerData,
          ships: applyColorsToShips(cloudPlayerData.ships, 1),
        }
        game.players.push(pd)
      }
      return game
    } else {
      return undefined
    }
  }, [game, currentUserIsPlayer, cloudPlayerData])

  return {
    game: gameWithPlayers,
    currentUserIsPlayer,
    error,
  }
}
