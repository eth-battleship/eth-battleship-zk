import structuredClone from "@ungap/structured-clone"
import delay from "delay"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useAsyncEffect } from 'use-async-effect'
import { CloudWatcher } from "../contexts"
import { applyColorsToShips, bigNumToMoves, bytesHexToShipLengths, bytesHexToShips, calculateHits, CloudGameData, CloudPlayerData, ContractGameData, GameData, GameState, PlayerData, shipsSitOn } from "../lib/game"
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
  const { watchGame, watchPlayerData, updateOpponentHits } = useCloud()
  const { account } = useGlobal()
  const [playerDataWatcher, setPlayerDataWatcher] = useState<CloudWatcher>()
  const [gameWatcher, setGameWatcher] = useState<CloudWatcher>()
  
  const [updatedCloudGameData, setUpdatedCloudGameData] = useState<CloudGameData>()
  const [cloudGameData, setCloudGameData] = useState<CloudGameData>()
  
  const [updatedCloudPlayerData, setUpdatedCloudPlayerData] = useState<CloudPlayerData>()
  const [cloudPlayerData, setCloudPlayerData] = useState<CloudPlayerData>()

  const [contractGameData, setContractGameData] = useState<ContractGameData>()
  const [error, setError] = useState<string>()

  const contract = useContract()

  // watchers
  useEffect(() => {
    if (!gameWatcher || gameWatcher.inputId !== gameId) {
      if (gameWatcher) {
        gameWatcher.unsub()
        setGameWatcher(undefined)
      }

      setUpdatedCloudGameData(undefined)

      if (gameId) {
        setGameWatcher(watchGame(gameId, setUpdatedCloudGameData))
      }
    }
  }, [gameId, gameWatcher, watchGame])
  useEffect(() => {
    if (!playerDataWatcher || playerDataWatcher.inputId !== gameId) {
      if (playerDataWatcher) {
        playerDataWatcher.unsub()
        setPlayerDataWatcher(undefined)
      }

      setUpdatedCloudPlayerData(undefined)

      if (gameId) {
        setPlayerDataWatcher(watchPlayerData(gameId, setUpdatedCloudPlayerData))
      }
    }
  }, [gameId, playerDataWatcher, watchPlayerData])

  // when updated cloud data comes in, update the working data set with it
  useEffect(() => {
    if (!updatedCloudGameData) {
      return
    }

    if (!cloudGameData || updatedCloudGameData.updateCount > cloudGameData.updateCount) {
      setCloudGameData(updatedCloudGameData)
    }
  }, [cloudGameData, contract, gameId, updatedCloudGameData])
  useEffect(() => {
    if (!updatedCloudPlayerData) {
      return
    }

    if (!cloudPlayerData || updatedCloudPlayerData.updateCount > cloudPlayerData.updateCount) {
      setCloudPlayerData(updatedCloudPlayerData)
    }
  }, [cloudGameData, cloudPlayerData, updatedCloudGameData, updatedCloudPlayerData])

  // load contract game data
  const reloadContractData = useCallback(async (id?: number) => {
    try {
      if (!id) {
        setContractGameData(undefined)
        return
      }

      // let's bust a cache
      const d = await contract.games(id)

      const obj: ContractGameData = {
        id,
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
      const pd1 = await contract.players(id, obj.player1)
      obj.players[1] = {
        gameId: `${id}`,
        player: obj.player1,
        moves: bigNumToMoves(obj.boardLength, pd1.moves),
        ships: bytesHexToShips(pd1.ships, obj.shipLengths),
      }
      if (obj.player2) {
        const pd2 = await contract.players(id, obj.player2)
        obj.players[2] = {
          gameId: `${id}`,
          player: obj.player2!,
          moves: bigNumToMoves(obj.boardLength, pd2.moves),
          ships: bytesHexToShips(pd2.ships, obj.shipLengths),
        }
      }
      // set flags
      for (let i = 1; i <= 2; i += 1) {
        if (obj.players[i]) {
          if (obj.players[i].moves.length) {
            obj.players[i].revealedMoves = true
          }

          if (obj.players[i].ships.length) {
            obj.players[i].ships = applyColorsToShips(obj.players[i].ships, i)
            obj.players[i].revealedBoard = true
          }
        }
      }
      // calculate hits if possible
      if (obj.players[1].moves.length && obj.players[2].ships.length) {
        obj.players[1].hits = calculateHits(obj.players[2].ships, obj.players[1].moves)
      }
      if (obj.players[2]) {
        if (obj.players[2].moves.length && obj.players[1].ships.length) {
          obj.players[2].hits = calculateHits(obj.players[1].ships, obj.players[2].moves)
        }
      }

      setContractGameData(obj)
    } catch (err: any) {
      setError(`Error loading game info from contract: ${err.toString()}`)
    }
  }, [contract])

  // also reload contract data every 5 seconds in case there is stale data coming from network
  useEffect(() => {
    const timer = setInterval(() => reloadContractData(gameId), 5000)
    return () => clearInterval(timer)
  }, [gameId, reloadContractData])

  // combine both sets of data
  const gameWithoutPlayers = useMemo(() => {
    if (cloudGameData && contractGameData) {      
      const obj = {
        ...structuredClone(cloudGameData),
        ...structuredClone(contractGameData), // overwrite cloud data with contract data
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
    if (account === gameWithoutPlayers?.player1) {
      return 1
    } else if (account === gameWithoutPlayers?.player2) {
      return 2
    } else {
      return 0
    }
  }, [account, gameWithoutPlayers?.player1, gameWithoutPlayers?.player2])

  const game = useMemo(() => {
    if (gameWithoutPlayers) {
      // @ts-ignore
      const ret: GameData = structuredClone(gameWithoutPlayers) 

      // augment with cloud PRIVATE data if possible
      if (cloudPlayerData) {
        for (let i = 1; i <= 2; i += 1) {
          if (currentUserIsPlayer === i) {
            if (gameWithoutPlayers.players[i]) {
              if (!gameWithoutPlayers.players[i].ships.length) {
                ret.players[i].ships = applyColorsToShips(cloudPlayerData.ships, i)
              }
              if (!gameWithoutPlayers.players[i].moves.length) {
                ret.players[i].moves = structuredClone(cloudPlayerData.moves)
              }
            }
          }
        }
      }

      // augment with cloud PUBLIC data if not already set
      if (!gameWithoutPlayers.players[1].moves.length) {
        ret.players[1].moves = structuredClone(cloudGameData?.player1Moves || [])
      }
      if (!gameWithoutPlayers.players[1].hits?.length) {
        ret.players[1].hits = ret.player1Hits || []
      }
      if (gameWithoutPlayers.players[2]) {
        if (!gameWithoutPlayers.players[2].moves.length) {
          ret.players[2].moves = structuredClone(cloudGameData?.player2Moves || [])
        }
        if (!gameWithoutPlayers.players[2].hits?.length) {
          ret.players[2].hits = ret.player2Hits || []
        }
      }

      return ret
    } else {
      return undefined
    }
  }, [cloudGameData?.player1Moves, cloudGameData?.player2Moves, cloudPlayerData, currentUserIsPlayer, gameWithoutPlayers])

  // update opponent hits
  useAsyncEffect(async () => {
    if (!currentUserIsPlayer || game?.status === GameState.NEED_OPPONENT) {
      return
    }

    const playerShips = (currentUserIsPlayer === 1) ? game!.players[1].ships : game!.players[2].ships
    const opponentMoves = (currentUserIsPlayer === 1) ? game!.players[2].moves! : game!.players[1].moves!
    const opponentHits = (currentUserIsPlayer === 1) ? game!.players[2].hits! : game!.players[1].hits!

    // if there are some hits that need calculating
    if (opponentMoves && opponentHits && opponentMoves.length > opponentHits.length) {
      for (let i = opponentHits.length; i < opponentMoves.length; i += 1) {
        opponentHits.push(shipsSitOn(playerShips, opponentMoves[i]))
      }

      // update cloud db
      await updateOpponentHits(game!.id, opponentHits)
    }
  }, [currentUserIsPlayer, game?.updateCount])

  return {
    game,
    currentUserIsPlayer,
    error,
  }
}
