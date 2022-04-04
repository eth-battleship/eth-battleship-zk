import { useCallback, useEffect, useMemo, useState } from "react"

import { useAsyncEffect } from 'use-async-effect'
import { CloudWatcher } from "../contexts"
import { applyColorsToShips, bytesHexToMoves, bytesHexToShipLengths, bytesHexToShips, CloudGameData, CloudPlayerData, ContractGameData, GameData, GameState, PlayerData } from "../lib/game"
import { ADDRESS_ZERO } from "../lib/utils"
import { useCloud, useGlobal } from "./contexts"
import { useContract } from "./contract"

export interface UseGameHook {
  game: GameData | undefined,
  currentUserIsPlayer?: number,
  error?: string,
}

/**
 * Asynchronous action progress indicator.
 */
export const useGame = (gameId?: number): UseGameHook => {
  const { watchGame, watchPlayerData } = useCloud()
  const { account } = useGlobal()
  const [playerDataWatcher, setPlayerDataWatcher] = useState<CloudWatcher>()
  const [gameWatcher, setGameWatcher] = useState<CloudWatcher>()
  const [cloudGameData, setCloudGameData] = useState<CloudGameData>()
  const [cloudPlayerData, setCloudPlayerData] = useState<CloudPlayerData>()
  const [contractGameData, setContractGameData] = useState<ContractGameData>()
  const [error, setError] = useState<string>()

  // when cloud game data gets updated
  const onUpdateCloudGame = useCallback(async (g: CloudGameData) => {
    if (!cloudGameData || g.updateCount > cloudGameData.updateCount) {
      setCloudGameData(g)
    }
  }, [cloudGameData])

  // when cloud player data gets updated
  const onUpdateCloudPlayerData = useCallback(async (pd: CloudPlayerData) => {
    if (!cloudPlayerData || pd.updateCount > cloudPlayerData.updateCount) {
      setCloudPlayerData(pd)
    }
  }, [cloudPlayerData])

  // watchers
  useEffect(() => {
    if (!gameWatcher || gameWatcher.inputId !== gameId) {
      if (gameWatcher) {
        gameWatcher.unsub()
        setGameWatcher(undefined)
      }

      setCloudGameData(undefined)

      if (gameId) {
        setGameWatcher(watchGame(gameId, onUpdateCloudGame))
      }
    }
  }, [gameId, gameWatcher, onUpdateCloudGame, watchGame])
  useEffect(() => {
    if (!playerDataWatcher || playerDataWatcher.inputId !== gameId) {
      if (playerDataWatcher) {
        playerDataWatcher.unsub()
        setPlayerDataWatcher(undefined)
      }

      setCloudPlayerData(undefined)

      if (gameId) {
        setPlayerDataWatcher(watchPlayerData(gameId, onUpdateCloudPlayerData))
      }
    }
  }, [gameId, onUpdateCloudPlayerData, playerDataWatcher, watchPlayerData])

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

      const obj: ContractGameData = {
        id: gameId,
        boardLength: d.boardSize.toNumber(),
        totalRounds: d.numRounds.toNumber(),
        shipLengths: bytesHexToShipLengths(d.shipSizes),
        player1: d.player1,
        player2: d.player2 !== ADDRESS_ZERO ? d.player2 : undefined,
        status: GameState.UNKNOWN,
        players: {},
      }

      switch (d.state) {
        case 0:
          obj.status = GameState.NEED_OPPONENT
          break
        case 1:
          obj.status = GameState.UNKNOWN
          break
        case 2:
          obj.status = GameState.REVEAL_MOVES
          break
        case 3:
          obj.status = GameState.REVEAL_BOARD
          break
        case 4:
          obj.status = GameState.ENDED
          obj.winner = d.winner
          break
        default:
        // nothing
      }

      // load player data from contract
      const pd1 = await contract.players(gameId, obj.player1)
      obj.players[1] = {
        gameId: `${gameId}`,
        player: obj.player1,
        moves: bytesHexToMoves(pd1.moves),
        ships: bytesHexToShips(pd1.ships, obj.shipLengths),
      }
      if (obj.player2) {
        const pd2 = await contract.players(gameId, obj.player2)
        obj.players[2] = {
          gameId: `${gameId}`,
          player: obj.player2!,
          moves: bytesHexToMoves(pd2.moves),
          ships: bytesHexToShips(pd2.ships, obj.shipLengths),
        }
      }

      setContractGameData(obj)
    } catch (err: any) {
      setError(`Error loading game info from contract: ${err.toString()}`)
    }
  }, [contract, gameId])

  // combine both sets of data
  const game = useMemo(() => {
    if (cloudGameData && contractGameData) {
      const obj = {
        ...cloudGameData,
        ...contractGameData, // overwrite cloud data with contract data
      }

      if (contractGameData.status === GameState.UNKNOWN) {
        obj.status = cloudGameData.status
      }

      return obj
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
    if (game) {
      // augment player data with cloud data where necessary and possible
      if (cloudPlayerData) {
        if (currentUserIsPlayer === 1) {
          if (game.players[1]) {
            if (!game.players[1].ships.length) {
              game.players[1].ships = applyColorsToShips(cloudPlayerData.ships, 1)
            }
            if (!game.players[1].moves.length) {
              game.players[1].moves = cloudPlayerData.moves
            }
          }
        } else if (currentUserIsPlayer === 2) {
          if (game.players[2]) {
            if (!game.players[2].ships.length) {
              game.players[2].ships = applyColorsToShips(cloudPlayerData.ships, 2)
            }
            if (!game.players[2].moves.length) {
              game.players[2].moves = cloudPlayerData.moves
            }
          }
        }
      }

      game.player1Hits = game.player1Hits || []
      game.player2Hits = game.player2Hits || []

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
