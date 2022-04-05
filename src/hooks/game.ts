import delay from 'delay'
import structuredClone from "@ungap/structured-clone"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useAsyncEffect } from 'use-async-effect'
import { CloudWatcher } from "../contexts"
import { applyColorsToShips, bigNumToMoves, bytesHexToShipLengths, bytesHexToShips, CloudGameData, CloudPlayerData, ContractGameData, GameData, GameState, PlayerData, shipsSitOn } from "../lib/game"
import { ADDRESS_ZERO } from "../lib/utils"
import { useCloud, useGlobal } from "./contexts"
import { useContract } from "./contract"
import { useCall } from '@usedapp/core'

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
  const [shouldReloadFromContract, setShouldReloadFromContract] = useState<boolean>(false)
  const [error, setError] = useState<string>()

  // watchers
  useEffect(() => {
    if (!gameWatcher || gameWatcher.inputId !== gameId) {
      if (gameWatcher) {
        gameWatcher.unsub()
        setGameWatcher(undefined)
      }

      setCloudGameData(undefined)

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

      setCloudPlayerData(undefined)

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
      const currentStatus = cloudGameData?.status

      setCloudGameData(updatedCloudGameData)

      // see if we should reload from contract
      const gotOpponent = (currentStatus === GameState.NEED_OPPONENT && updatedCloudGameData.status === GameState.PLAYING)
      const playingOver = (updatedCloudGameData.status === GameState.REVEAL_MOVES || updatedCloudGameData.status === GameState.REVEAL_BOARD || updatedCloudGameData.status === GameState.ENDED)
      if (gotOpponent || playingOver) {
        setShouldReloadFromContract(true)
      }
    }
  }, [cloudGameData, updatedCloudGameData])
  useEffect(() => {
    if (!updatedCloudPlayerData) {
      return
    }

    if (!cloudPlayerData || updatedCloudPlayerData.updateCount > cloudPlayerData.updateCount) {
      setCloudPlayerData(updatedCloudPlayerData)
    }
  }, [cloudGameData, cloudPlayerData, updatedCloudGameData, updatedCloudPlayerData])

  // load contract game data
  const contract = useContract()

  const reloadContractData = useCallback(async () => {
    try {
      if (!gameId) {
        console.log('game id not set')
        setContractGameData(undefined)
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
        moves: bigNumToMoves(obj.boardLength, pd1.moves),
        ships: bytesHexToShips(pd1.ships, obj.shipLengths),
      }
      if (obj.player2) {
        const pd2 = await contract.players(gameId, obj.player2)
        obj.players[2] = {
          gameId: `${gameId}`,
          player: obj.player2!,
          moves: bigNumToMoves(obj.boardLength, pd2.moves),
          ships: bytesHexToShips(pd2.ships, obj.shipLengths),
        }
      }
      for (let i = 1; i <= 2; i += 1) {
        if (obj.players[i].moves.length) {
          obj.players[i].revealedMoves = true
        }

        if (obj.players[i].ships.length) {
          obj.players[i].ships = applyColorsToShips(obj.players[i].ships, i)
          obj.players[i].revealedBoard = true
        }
      }

      setContractGameData(obj)
    } catch (err: any) {
      setError(`Error loading game info from contract: ${err.toString()}`)
    }
  }, [contract, gameId])

  // reload contract data at key points in the game
  useEffect(() => {
    const isNewGame = contractGameData?.id !== gameId

    if (isNewGame || shouldReloadFromContract) {
      setShouldReloadFromContract(false)
      reloadContractData()
    }
  }, [contractGameData?.id, gameId, reloadContractData, shouldReloadFromContract])

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

      // augment player data with cloud data where necessary and possible
      if (cloudPlayerData) {
        for (let i = 1; i <= 2; i += 1) {
          if (currentUserIsPlayer === i) {
            if (gameWithoutPlayers.players[1]) {
              if (!gameWithoutPlayers.players[currentUserIsPlayer].ships.length) {
                gameWithoutPlayers.players[currentUserIsPlayer].ships = applyColorsToShips(cloudPlayerData.ships, currentUserIsPlayer)
              }
              if (!gameWithoutPlayers.players[currentUserIsPlayer].moves.length) {
                ret.players[currentUserIsPlayer].moves = structuredClone(cloudPlayerData.moves)
              }
            }
          }
        }
      }

      // set moves from public list if not already set
      if (!gameWithoutPlayers.players[1].moves.length) {
        ret.players[1].moves = structuredClone(cloudGameData?.player1Moves || [])
        ret.players[1].hits = ret.player1Hits || []
      }
      if (gameWithoutPlayers.players[2] && !gameWithoutPlayers.players[2].moves.length) {
        ret.players[2].moves = structuredClone(cloudGameData?.player2Moves || [])
        ret.players[2].hits = ret.player2Hits || []
      }

      return ret
    } else {
      return undefined
    }
  }, [gameWithoutPlayers, cloudPlayerData, currentUserIsPlayer, cloudGameData?.player1Moves, cloudGameData?.player2Moves])

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
