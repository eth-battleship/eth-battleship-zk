import structuredClone from "@ungap/structured-clone"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useAsyncEffect } from 'use-async-effect'
import { applyColorsToShips, bigNumToMoves, bytesHexToShipLengths, bytesHexToShips, calculateHits, ContractGameData, GameData, GameState, shipsSitOn } from "../lib/game"
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
  const { watchGame, watchedGame, watchedGameId, updateOpponentHits } = useCloud()
  const { account } = useGlobal()
  const [contractGameData, setContractGameData] = useState<ContractGameData>()
  const [error, setError] = useState<string>()

  const contract = useContract()

  // watchers
  useEffect(() => {
    if (gameId && watchedGameId !== gameId) {
      watchGame(gameId)
    }
  }, [gameId, watchGame, watchedGameId])

  // load contract game data
  const reloadContractData = useCallback(async (id?: number) => {
    try {
      if (!id) {
        setContractGameData(undefined)
        return
      }

      const d = await contract.games(id)

      const obj: ContractGameData = {
        id,
        boardLength: d.boardSize.toNumber(),
        totalRounds: d.numRounds.toNumber(),
        shipLengths: bytesHexToShipLengths(d.shipSizes),
        player1: d.player1,
        player2: d.player2 !== ADDRESS_ZERO ? d.player2 : undefined,
        status: GameState.NEED_OPPONENT,
        players: {},
      }

      switch (d.state) {
        case 0:
          obj.status = GameState.NEED_OPPONENT
          break
        case 1:
          obj.status = GameState.PLAYING
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
        moves: bigNumToMoves(obj.boardLength, pd1.moves),
        ships: bytesHexToShips(pd1.ships, obj.shipLengths),
      }
      if (obj.player2) {
        const pd2 = await contract.players(id, obj.player2)
        obj.players[2] = {
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
    reloadContractData(gameId)
    const timer = setInterval(() => reloadContractData(gameId), 5000)
    return () => clearInterval(timer)
  }, [gameId, reloadContractData])

  // current user is player?
  const currentUserIsPlayer = useMemo(() => {
    if (account === contractGameData?.player1) {
      return 1
    } else if (account === contractGameData?.player2) {
      return 2
    } else {
      return 0
    }
  }, [account, contractGameData?.player1, contractGameData?.player2])

  // combine both sets of data
  const game = useMemo(() => {
    if (watchedGame && contractGameData) {    
      // start with cloud data
      const obj = structuredClone(watchedGame) as GameData
      
      // layer over the contract data
      ;[
        'boardLength', 
        'totalRounds',
        'shipLengths',
        'player1',
        'player2',
        'status'
      ].forEach((k: string) => {
        // @ts-ignore
        obj[k] = contractGameData[k]
      })

      // ready to reveal moves?
      if (obj.status === GameState.PLAYING && watchedGame.status === GameState.REVEAL_MOVES) {  
        obj.status = GameState.REVEAL_MOVES
      }

      // now use contract player data where available
      for (let i = 1; i <= 2; i += 1) {
        if (obj.players[i]) {
          // always ensure there are always certain arrays
          obj.players[i].hits = obj.players[i].hits || []
          obj.players[i].moves = obj.players[i].moves || []
          obj.players[i].ships = obj.players[i].ships || []

          if (contractGameData.players[i]?.ships.length) {
            obj.players[i].ships = structuredClone(contractGameData.players[i].ships)
          }
          if (contractGameData.players[i]?.moves.length) {
            obj.players[i].moves = structuredClone(contractGameData.players[i].moves)
          }
          if (contractGameData.players[i]?.hits?.length) {
            obj.players[i].hits = structuredClone(contractGameData.players[i].hits)
          }

          // add colors to ships
          if (obj.players[i].ships) {
            obj.players[i].ships = applyColorsToShips(obj.players[i].ships, i)
          }
        }
      }

      return obj
    } else {
      return undefined
    }
  }, [watchedGame, contractGameData])

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
      updateOpponentHits(game!.id, opponentHits)
    }
  }, [currentUserIsPlayer, game?.updateCount])

  return {
    game,
    currentUserIsPlayer,
    error,
  }
}
