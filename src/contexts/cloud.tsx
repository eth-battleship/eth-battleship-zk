import React, { useState, useCallback, useEffect } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, query, onSnapshot, doc, getDoc, setDoc, Firestore, Unsubscribe, collection, orderBy, where } from 'firebase/firestore'
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
  updateOpponentHits: (id: any, hits: boolean[]) => void,
  playMove: (id: any, cellPos: Position) => Promise<void>,
  reveal: (id: any) => Promise<void>,
  watchGame: (id: any) => void,
  watchedGameId?: number,
  watchedGame?: CloudGameData,
  gameList?: CloudGameData[],
}

interface Watcher {
  unsub: Unsubscribe,
  id: any,
}

export const CloudContext = React.createContext({} as CloudContextValue)

let updateHitsTimer: any

export const CloudProvider: React.FunctionComponent = ({ children }) => {
  const { account, authSig, currentChain } = useGlobal()
  const [ db, setDb ] = useState<Firestore>()
  const [ connectError, setConnectError ] = useState<string>('')
  const [ connected, setConnected ] = useState<boolean>(false)
  
  const [watchedGameId, setWatchedGameId] = useState<number>()
  const [watchedGameNewData, setWatchedGameNewData] = useState<any>()
  const [watchedGame, setWatchedGame] = useState<CloudGameData>()
  const [watchedGameUpdateCount, setWatchedGameUpdateCount] = useState<number>()
  const [watchGameSub, setWatchGameSub] = useState<Watcher>()

  const [gameList, setGameList] = useState<CloudGameData[]>()

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
      chain: currentChain?.genesisBlockHash!,
      chainId: currentChain?.chainId,
      boardLength,
      totalRounds,
      player1: account,
      players: {
        1: {
          private: await encrypt(authSig, {
            ships,
            moves: [],
          }),
          moves: [],
          hits: [],
        },
      },
      status: GameState.NEED_OPPONENT,
      created: Date.now(),
      updateCount: 1,
    })
  }, [account, authSig, currentChain?.chainId, currentChain?.genesisBlockHash, deriveGameRef])

  const joinGame = useCallback(async (id: any, ships: ShipConfig[]) => {
    const gameRef = deriveGameRef(id)

    const { players, updateCount }: any = (await getDoc(gameRef)).data()

    await setDoc(gameRef, {
      id,
      player2: account,
      players: {
        ...players,
        2: {
          private: await encrypt(authSig, {
            ships,
            moves: [],
          }),
          moves: [],
          hits: [],
        }
      },
      status: GameState.PLAYING,
      updateCount: updateCount + 1,
    }, { merge: true })
  }, [account, authSig, deriveGameRef])

  const updateOpponentHits = useCallback((id: any, hits: boolean[]) => {
    // do this with a delay in case opponent does lots of moves in one go
    if (updateHitsTimer) {
      clearTimeout(updateHitsTimer)
    }
    updateHitsTimer = setTimeout(async () => {
      const gameRef = deriveGameRef(id)

      const { updateCount, player1, player2, players }: any = (await getDoc(gameRef)).data()

      const isPlayer1 = (account === player1)
      const isPlayer2 = (account === player2)

      if (!(isPlayer1 || isPlayer2)) {
        throw new Error('Must be a player')
      }

      const opponentPlayer = isPlayer1 ? 2 : 1

      const opponentMoves = players[opponentPlayer].moves

      if (hits.length !== opponentMoves.length) {
        throw new Error(`Hits array length mismatch: ${hits.length} != ${opponentMoves.length}`)
      }

      // update hits
      players[opponentPlayer].hits = hits

      // update
      await setDoc(gameRef, {
        updateCount: updateCount + 1,
        players,
      }, { merge: true })
    }, 2000)
  }, [account, deriveGameRef])

  const reveal = useCallback(async (id: any) => {
    const gameRef = deriveGameRef(id)

    const { updateCount, player1, player2, players, status }: any = (await getDoc(gameRef)).data()

    const isPlayer1 = (account === player1)
    const isPlayer2 = (account === player2)

    if (!(isPlayer1 || isPlayer2)) {
      throw new Error('Must be a player')
    }

    const activePlayer = isPlayer1 ? 1 : 2

    let newStatus = status

    switch (status) {
      case GameState.REVEAL_MOVES:
        players[activePlayer].revealedMoves = true
        if (players[1].revealedMoves && players[2].revealedMoves) {
          newStatus = GameState.REVEAL_BOARD
        }
        break
      case GameState.REVEAL_BOARD:
        players[activePlayer].revealedBoard = true
        if (players[1].revealedBoard && players[2].revealedBoard) {
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
        players,
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
      players,
      status,
    }: any = (await getDoc(gameRef)).data()

    const isPlayer1 = (account === player1)
    const isPlayer2 = (account === player2)

    if (!(isPlayer1 || isPlayer2)) {
      throw new Error('Must be a player')
    }

    if (status !== GameState.PLAYING) {
      throw new Error('Game not in play state')
    }

    // add to moves data
    const activePlayer = isPlayer1 ? 1 : 2
    players[activePlayer].moves.push(pos)
    players[activePlayer].private = await addToMovesArray(players[activePlayer].private, authSig, pos, totalRounds)

    // stop when all rounds are done
    let newStatus: GameState
    if ((players[1].moves.length === players[2].moves.length) && (players[1].moves.length === totalRounds)) {
      newStatus = GameState.REVEAL_MOVES
    } else {
      newStatus = GameState.PLAYING
    }

    // update
    await setDoc(gameRef, {
      updateCount: updateCount + 1,
      players,
      status: newStatus,
    }, { merge: true })
  }, [account, addToMovesArray, authSig, deriveGameRef])

  useEffect(() => {
    if (db && currentChain?.genesisBlockHash) {
      const ref = query(
        collection(db!, "games"), 
        where("chain", '==', currentChain.genesisBlockHash),
        orderBy("id", "desc")
      )

      return onSnapshot(ref, (querySnapshot: any) => {
        const games: CloudGameData[] = []
        querySnapshot.forEach((doc: any) => {
          games.push(doc.data())
        })
        setGameList(games)
      })
    }
  }, [currentChain?.genesisBlockHash, db])

  const watchGame = useCallback((id: any) => {
    if (watchGameSub && watchGameSub.id !== id) {
      watchGameSub.unsub()
      setWatchedGameNewData(undefined)
    }

    const gameRef = deriveGameRef(id)

    setWatchedGameId(id)

    setWatchGameSub({
      id,
      unsub: onSnapshot(gameRef, dc => {
        setWatchedGameNewData(dc.data())
      })
    })
  }, [deriveGameRef, watchGameSub])

  useEffect(() => {
    if (watchedGameNewData && watchedGameNewData.updateCount !== watchedGameUpdateCount) {
      setWatchedGameUpdateCount(watchedGameNewData.updateCount)

      ;(async () => {
        const obj: any = watchedGameNewData

        if (account === obj.player1) {
          const { moves, ships } = await decrypt(authSig, obj.players[1].private) as any
          Object.assign(obj.players[1], { moves, ships })
        } else if (account === obj.player2) {
          const { moves, ships } = await decrypt(authSig, obj.players[2].private) as any
          Object.assign(obj.players[2], { moves, ships })
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
      gameList,
    }}>
      {children}
    </CloudContext.Provider>
  )
}

export const CloudConsumer = CloudContext.Consumer