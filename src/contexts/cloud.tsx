import React, { useState, useCallback } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, onSnapshot, doc, getDoc, setDoc, Firestore, Unsubscribe } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { useAsyncEffect } from 'use-async-effect'
import { useGlobal } from '../hooks'
import { CloudGameData, CloudPlayerData, createGameId, createPlayerDataId, GameState, PlayerData, Position, ShipConfig } from '../lib/game'
import { tasks } from 'hardhat'

const firebaseConfig = {
  apiKey: "AIzaSyCPEb5ujsgWNd_7iQQBtymjmptGp9fim9Y",
  authDomain: "zk-battleship.firebaseapp.com",
  projectId: "zk-battleship",
  storageBucket: "zk-battleship.appspot.com",
  messagingSenderId: "926801122471",
  appId: "1:926801122471:web:913a7ffa6fa43e9578b782"
}

const app = initializeApp(firebaseConfig)

export type OnWatchGameHandler = (game: CloudGameData) => void
export type OnWatchPlayerDataHandler = (playerData: CloudPlayerData) => void

export interface CloudWatcher {
  inputId: any,
  unsub: Unsubscribe,
}

export interface CloudContextValue {
  connected: boolean,
  connectError: string,
  addNewGame: (id: any, boardLength: number, totalRounds: number, ships: ShipConfig[]) => Promise<void>,
  joinGame: (id: any, ships: ShipConfig[]) => Promise<void>,
  updateOpponentHits: (id: any, hits: boolean[]) => Promise<void>,
  playMove: (id: any, cellPos: Position) => Promise<void>,
  reveal: (id: any) => Promise<void>,
  watchGame: (id: any, callback: OnWatchGameHandler) => CloudWatcher,
  watchPlayerData: (id: any, callback: OnWatchPlayerDataHandler) => CloudWatcher,
}

export const CloudContext = React.createContext({} as CloudContextValue);

export const CloudProvider: React.FunctionComponent = ({ children }) => {
  const { account, authSig, currentChain } = useGlobal()
  const [ db, setDb ] = useState<Firestore>()
  const [ connectError, setConnectError ] = useState<string>('')
  const [ connected, setConnected ] = useState<boolean>(false)

  useAsyncEffect(async () => {
    try {
      const auth = getAuth()

      onAuthStateChanged(auth, (user) => {
        if (user) {
          // console.log('Firebase user signed-in')
          setDb(getFirestore(app))
          setConnected(true)
        } else {
          console.log('Firebase user signed-out')
          setConnected(false)
        }
      })

      await signInAnonymously(auth)
    } catch (err: any) {
      console.error(err)
      setConnectError(`Error connecting to Firestore: ${err.meviewssage}`)
    }
  }, [])

  const addNewGame = useCallback(async (id: any, boardLength: number, totalRounds: number, ships: ShipConfig[]) => {
    const gameId = createGameId(currentChain!, id)

    await Promise.all([
      setDoc(doc(db!, 'games', gameId), {
        id,
        chain: currentChain?.chainId,
        boardLength,
        totalRounds,
        player1: account,
        status: GameState.NEED_OPPONENT,
        created: Date.now(),
        updateCount: 1,
      }),
      setDoc(doc(db!, 'playerData', createPlayerDataId(authSig, id)), { 
        gameId,
        player: account,
        ships,
        moves: [],
        updateCount: 1,
      })
    ])
  }, [account, authSig, currentChain, db])

  const joinGame = useCallback(async (id: any, ships: ShipConfig[]) => {
    const gameId = createGameId(currentChain!, id)

    const ref = doc(db!, 'games', gameId)

    const { updateCount }: any = (await getDoc(ref)).data()

    await Promise.all([
      setDoc(ref, {
        id,
        player2: account,
        status: GameState.PLAYING,
        updateCount: updateCount + 1,
      }, { merge: true }),
      setDoc(doc(db!, 'playerData', createPlayerDataId(authSig, id)), {
        gameId,
        player: account,
        ships,
        moves: [],
        updateCount: 1,
      })
    ])
  }, [account, authSig, currentChain, db])

  const updateOpponentHits = useCallback(async (id: any, hits: boolean[]) => {
    const gameRef = doc(db!, 'games', createGameId(currentChain!, id))

    const { updateCount, player1, player2, player1Moves, player2Moves }: any = (await getDoc(gameRef)).data()

    const isPlayer1 = (account === player1)
    const isPlayer2 = (account === player2)

    if (!(isPlayer1 || isPlayer2)) {
      throw new Error('Must be a player')
    }

    const existingMoves = isPlayer1 ? player2Moves : player1Moves

    if (hits.length !== existingMoves.length) {
      throw new Error(`Hits array length mismatch: ${hits.length} != ${existingMoves.length}`)
    }

    // update
    await Promise.all([
      setDoc(gameRef, {
        updateCount: updateCount + 1,
        ...(
          isPlayer1
            ? { player2Hits: hits }
            : { player1Hits: hits }
        ),
      }, { merge: true }),
    ])
  }, [account, currentChain, db])

  const reveal = useCallback(async (id: any) => {
    const gameRef = doc(db!, 'games', createGameId(currentChain!, id))

    const { updateCount, player1, player2, status, ...other }: any = (await getDoc(gameRef)).data()
    let { 
      player1RevealedMoves = false, 
      player2RevealedMoves = false,
      player1RevealedBoard = false, 
      player2RevealedBoard = false,
    } = other

    const isPlayer1 = (account === player1)
    const isPlayer2 = (account === player2)

    if (!(isPlayer1 || isPlayer2)) {
      throw new Error('Must be a player')
    }

    let newStatus = status

    switch (status) {
      case GameState.REVEAL_MOVES:
        if (isPlayer1) {
          player1RevealedMoves = true
        } else {
          player2RevealedMoves = true
        }

        if (player1RevealedMoves && player2RevealedMoves) {
          newStatus = GameState.REVEAL_BOARD
        }

        break

      case GameState.REVEAL_BOARD:
        if (isPlayer1) {
          player1RevealedBoard = true
        } else {
          player2RevealedBoard = true
        }

        if (player1RevealedBoard && player2RevealedBoard) {
          newStatus = GameState.ENDED
        }

        break

      default:
        throw new Error('Game not in correct state')
    }

    await Promise.all([
      setDoc(gameRef, {
        updateCount: updateCount + 1,
        status: newStatus,
        player1RevealedMoves,
        player2RevealedMoves,
        player1RevealedBoard,
        player2RevealedBoard,
      }, { merge: true }),
    ])
  }, [account, currentChain, db])

  const playMove = useCallback(async (id: any, pos: Position) => {

    // we debounce this one
    const gameRef = doc(db!, 'games', createGameId(currentChain!, id))
    const playerDataRef = doc(db!, 'playerData', createPlayerDataId(authSig, id))

    const { updateCount, totalRounds, player1, player2, player1Moves = [], player2Moves = [], status }: any = (await getDoc(gameRef)).data()

    const isPlayer1 = (account === player1)
    const isPlayer2 = (account === player2)

    if (!(isPlayer1 || isPlayer2)) {
      throw new Error('Must be a player')
    }

    if (status !== GameState.PLAYING) {
      throw new Error('Game not in play state')
    }

    // add to moves array
    let { moves, updateCount: pdUpdateCount }: any = (await getDoc(playerDataRef)).data()
    moves = (moves || []).concat(pos)

    if (moves.length > totalRounds) {
      throw new Error('Too many moves')
    }

    // stop when all rounds are done
    if (isPlayer1) {
      player1Moves.push(pos)
    } else {
      player2Moves.push(pos)
    }

    let newStatus: GameState
    if ((player1Moves.length === player2Moves.length) && (player1Moves.length === totalRounds)) {
      newStatus = GameState.REVEAL_MOVES
    } else {
      newStatus = GameState.PLAYING
    }

    // update
    await Promise.all([
      setDoc(gameRef, {
        updateCount: updateCount + 1,
        status: newStatus,
        player1Moves,
        player2Moves,
      }, { merge: true }),
      setDoc(doc(db!, 'playerData', createPlayerDataId(authSig, id)), {
        moves,
        updateCount: pdUpdateCount + 1,
      }, { merge: true })
    ])
  }, [account, authSig, currentChain, db])

  const watchGame = useCallback((id: any, callback: OnWatchGameHandler) => {
    const unsub = onSnapshot(doc(db!, 'games', createGameId(currentChain!, id)), doc => {
      callback(doc.data() as CloudGameData)
    })

    return { unsub, inputId: id }
  }, [currentChain, db])

  const watchPlayerData = useCallback((id: any, callback: OnWatchPlayerDataHandler) => {
    const unsub = onSnapshot(doc(db!, 'playerData', createPlayerDataId(authSig, id)), doc => {
      callback(doc.data() as CloudPlayerData)
    })

    return { unsub, inputId: id }
  }, [authSig, db])

  return (
    <CloudContext.Provider value={{
      connectError, 
      connected,
      addNewGame,
      joinGame,
      updateOpponentHits,
      playMove,
      reveal,
      watchGame,
      watchPlayerData,
    }}>
      {children}
    </CloudContext.Provider>
  )
}

export const CloudConsumer = CloudContext.Consumer