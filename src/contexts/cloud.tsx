import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, onSnapshot, doc, getDoc, setDoc, Firestore, Unsubscribe } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { useAsyncEffect } from 'use-async-effect'
import { useGlobal } from '../hooks'
import { createGameId, createPlayerDataId, GameData, GameState, PlayerData, ShipConfig } from '../lib/game'

const firebaseConfig = {
  apiKey: "AIzaSyCPEb5ujsgWNd_7iQQBtymjmptGp9fim9Y",
  authDomain: "zk-battleship.firebaseapp.com",
  projectId: "zk-battleship",
  storageBucket: "zk-battleship.appspot.com",
  messagingSenderId: "926801122471",
  appId: "1:926801122471:web:913a7ffa6fa43e9578b782"
}

const app = initializeApp(firebaseConfig)

export interface CloudGameData extends GameData {
  id: number,
  boardLength: number,
  player1: string,
  player2?: string,
  status: GameState,
  created: number,
  updateCount: number,
}

export type OnWatchGameHandler = (game: CloudGameData) => void

export interface CloudGameWatcher {
  inputId: any,
  unsub: Unsubscribe,
}

export interface CloudContextValue {
  connected: boolean,
  connectError: string,
  addNewGame: (id: any, boardLength: number, ships: ShipConfig[]) => Promise<void>,
  loadPlayerData: (id: any) => Promise<PlayerData | undefined>
  watchGame: (id: any, callback: OnWatchGameHandler) => CloudGameWatcher
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
          console.log('Firebase user signed-in', user)
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

  const addNewGame = useCallback(async (id: any, boardLength: number, ships: ShipConfig[]) => {
    const gameId = createGameId(currentChain!, id)

    await Promise.all([
      setDoc(doc(db!, 'games', gameId), {
        id,
        chain: currentChain?.chainId,
        boardLength,
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
      })
    ])
  }, [account, authSig, currentChain, db])

  const loadPlayerData = useCallback(async (id: any) => {
    const docSnap = await getDoc(doc(db!, 'playerData', createPlayerDataId(authSig, id)))
    if (docSnap.exists()) {
      return docSnap.data() as PlayerData
    } else {
      return undefined
    }
  }, [authSig, db])

  const watchGame = useCallback((id: any, callback: OnWatchGameHandler) => {
    // load player data

    const unsub = onSnapshot(doc(db!, 'games', createGameId(currentChain!, id)), doc => {
      callback(doc.data() as CloudGameData)
    })

    return { unsub, inputId: id }
  }, [currentChain, db])

  return (
    <CloudContext.Provider value={{
      connectError, 
      connected,
      addNewGame,
      watchGame,
      loadPlayerData,
    }}>
      {children}
    </CloudContext.Provider>
  )
}

export const CloudConsumer = CloudContext.Consumer