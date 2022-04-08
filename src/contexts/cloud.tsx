import React, { useState, useCallback, useEffect } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, onSnapshot, doc, getDoc, setDoc, Firestore, Unsubscribe, FirestoreError } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { useAsyncEffect } from 'use-async-effect'
import { useGlobal } from '../hooks'
import { CloudGameData, createGameId, GameState, Position, ShipConfig } from '../lib/game'
import { CipherText, decrypt, encrypt } from '../lib/crypto'

const firebaseConfig = {
  apiKey: "AIzaSyCPEb5ujsgWNd_7iQQBtymjmptGp9fim9Y",
  authDomain: "zk-battleship.firebaseapp.com",
  projectId: "zk-battleship",
  storageBucket: "zk-battleship.appspot.com",
  messagingSenderId: "926801122471",
  appId: "1:926801122471:web:913a7ffa6fa43e9578b782"
}

const app = initializeApp(firebaseConfig)

export interface CloudContextValue {
  connected: boolean,
  connectError: string,
  addNewGame: (id: any, boardLength: number, totalRounds: number, ships: ShipConfig[]) => Promise<void>,
  joinGame: (id: any, ships: ShipConfig[]) => Promise<void>,
  updateOpponentHits: (id: any, hits: boolean[]) => Promise<void>,
  playMove: (id: any, cellPos: Position) => Promise<void>,
  reveal: (id: any) => Promise<void>,
  watchGame: (id: any) => void,
  watchedGameId?: number,
  watchedGame?: CloudGameData,
}

interface Watcher {
  unsub: Unsubscribe,
  id: any,
}

export const CloudContext = React.createContext({} as CloudContextValue)


export const CloudProvider: React.FunctionComponent = ({ children }) => {
  const { account, authSig, currentChain } = useGlobal()
  const [ db, setDb ] = useState<Firestore>()
  const [ connectError, setConnectError ] = useState<string>('')
  const [ connected, setConnected ] = useState<boolean>(false)
  
  
  const [watchedGameId, setWatchedGameId] = useState<number>()
  const [watchedGameNewData, setWatchedGameNewData] = useState<any>()
  const [watchedGame, setWatchedGame] = useState<CloudGameData>()
  const [watchedGameUpdateCount, setWatchedGameUpdateCount] = useState<number>()
  const [watcher, setWatcher] = useState<Watcher>()

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

  const deriveGameRef = useCallback((id: any) => doc(db!, 'games', createGameId(currentChain!, id)), [currentChain, db])

  const addNewGame = useCallback(async (id: any, boardLength: number, totalRounds: number, ships: ShipConfig[]) => {
    const gameRef = deriveGameRef(id)

    await setDoc(gameRef, {
      id,
      chain: currentChain?.chainId,
      boardLength,
      totalRounds,
      player1: account,
      player1Private: await encrypt(authSig, {
        ships,
        moves: [],
      }),
      status: GameState.NEED_OPPONENT,
      created: Date.now(),
      updateCount: 1,
    })
  }, [account, authSig, currentChain?.chainId, deriveGameRef])

  const joinGame = useCallback(async (id: any, ships: ShipConfig[]) => {
    const gameRef = deriveGameRef(id)

    const { updateCount }: any = (await getDoc(gameRef)).data()

    await setDoc(gameRef, {
      id,
      player2: account,
      player2Private: await encrypt(authSig, {
        ships,
        moves: [],
      }),
      status: GameState.PLAYING,
      updateCount: updateCount + 1,
    }, { merge: true })
  }, [account, authSig, deriveGameRef])

  const updateOpponentHits = useCallback(async (id: any, hits: boolean[]) => {
    const gameRef = deriveGameRef(id)

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
    await setDoc(gameRef, {
      updateCount: updateCount + 1,
      ...(
        isPlayer1
          ? { player2Hits: hits }
          : { player1Hits: hits }
      ),
    }, { merge: true })
  }, [account, deriveGameRef])

  const reveal = useCallback(async (id: any) => {
    const gameRef = deriveGameRef(id)

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
  }, [account, deriveGameRef])

  const addToMovesArray = useCallback(async (data: CipherText, password: string, move: Position, totalRounds: number) => {
    const dec: any = await decrypt(password, data)
    dec.moves.push(move)
    if (dec.moves.length > totalRounds) {
      throw new Error('Too many moves')
    }
    return await encrypt(password, dec)
  }, [])


  const playMove = useCallback(async (id: any, pos: Position) => {
    const gameRef = deriveGameRef(id)

    const { 
      updateCount, 
      totalRounds, 
      player1, 
      player2, 
      player1Moves = [], 
      player2Moves = [], 
      status,
      ...props
    }: any = (await getDoc(gameRef)).data()
    
    let { player1Private, player2Private } = props

    const isPlayer1 = (account === player1)
    const isPlayer2 = (account === player2)

    if (!(isPlayer1 || isPlayer2)) {
      throw new Error('Must be a player')
    }

    if (status !== GameState.PLAYING) {
      throw new Error('Game not in play state')
    }

    // add to moves data
    if (isPlayer1) {
      player1Private = await addToMovesArray(player1Private, authSig, pos, totalRounds)
      player1Moves.push(pos)
    } else {
      player2Private = await addToMovesArray(player2Private, authSig, pos, totalRounds)
      player2Moves.push(pos)
    }
    
    // stop when all rounds are done
    let newStatus: GameState
    if ((player1Moves.length === player2Moves.length) && (player1Moves.length === totalRounds)) {
      newStatus = GameState.REVEAL_MOVES
    } else {
      newStatus = GameState.PLAYING
    }

    // update
    await setDoc(gameRef, {
      updateCount: updateCount + 1,
      status: newStatus,
      player1Moves,
      player2Moves,
      player1Private,
      player2Private,
    }, { merge: true })
  }, [account, addToMovesArray, authSig, deriveGameRef])

  const watchGame = useCallback((id: any) => {
    if (watcher && watcher.id !== id) {
      watcher.unsub()
      setWatchedGameNewData(undefined)
    }

    const gameRef = deriveGameRef(id)

    setWatchedGameId(id)

    setWatcher({
      id,
      unsub: onSnapshot(gameRef, dc => {
        setWatchedGameNewData(dc.data())
      })
    }
      
    )
  }, [deriveGameRef, watcher])

  useEffect(() => {
    if (watchedGameNewData && watchedGameNewData.updateCount !== watchedGameUpdateCount) {
      setWatchedGameUpdateCount(watchedGameNewData.updateCount)

      ;(async () => {
        const obj: any = watchedGameNewData

        if (account === obj.player1) {
          obj.playerData = await decrypt(authSig, obj.player1Private)
        } else if (account === obj.player2) {
          obj.playerData = await decrypt(authSig, obj.player2Private)
        }

        setWatchedGame(obj as CloudGameData)
      })()
    }
  }, [account, authSig, watchedGameNewData, watchedGameUpdateCount])

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
      watchedGameId,
      watchedGame,
    }}>
      {children}
    </CloudContext.Provider>
  )
}

export const CloudConsumer = CloudContext.Consumer