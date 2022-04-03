import React, { useState, useMemo, useEffect } from 'react'
import { useEthers, ChainId } from '@usedapp/core'
import { setFonts } from 'emotion-styled-utils'
import { useAsyncEffect } from 'use-async-effect'

import { setupThemes } from '../themes'
import { ChainInfo, NETWORKS } from '../lib/chain'

// fonts
if (typeof window !== 'undefined' && !!window.document) {
  setFonts({
    body: {
      name: 'Open Sans',
      weights: {
        thin: 300,
        regular: 400,
        bold: 700,
      },
    },
    header: {
      name: 'Raleway',
      weights: {
        thin: 300,
        regular: 500,
        bold: 800,
      }
    }
  })
}

// setup themes
const themes = setupThemes({
  width: {
    tablet: '800px',
    desktop: '950px',
  },
  height: {
    tall: '800px',
  }
})

export interface GlobalContextValue {
  theme: object,
  account: string | null | undefined,
  authSig: string,
  expectedChain: ChainInfo,
  currentChain: ChainInfo | undefined,
  genesisBlockHash: string,
  unsupportedChain: boolean,
}

export const GlobalContext = React.createContext({} as GlobalContextValue);

export const GlobalProvider: React.FunctionComponent = ({ children }) => {
  // theme
  const [themeName] = useState('default')
  const [canonicalChainId, setCanonicalChainId] = useState<number | null>(null)
  const [genesisBlockHash, setGenesisBlockHash] = useState<string>('')
  const [authenticating, setAuthenticating] = useState<boolean>(false)
  const [authSig, setAuthSig] = useState<string>('')
  const theme = useMemo(() => themes.get(themeName), [themeName])

  // web3
  const { account, chainId, library, deactivate } = useEthers()

  // get correct chain id
  useAsyncEffect(async () => {
    try {
      setCanonicalChainId(null)
      const chainIdHexString = await library?.send('eth_chainId', [])
      setCanonicalChainId(chainIdHexString ? parseInt(chainIdHexString, 16) : null)
      const { hash } = (await library?.getBlock(0))!
      setGenesisBlockHash(hash)
    } catch (err) {
      console.error(`Error resolving canonical chain id and genesis block`, err)
    }
  }, [chainId, library])

  // current chain
  const currentChain = useMemo(() => {
    return Object.values(NETWORKS).find(({ chainId }) => chainId === canonicalChainId)
  }, [canonicalChainId])

  // get auth signature
  useAsyncEffect(async () => {
    if (!authSig && !authenticating && library && account) {
      try {
        setAuthenticating(true)
        const signature = await library?.send('personal_sign', ['Please sign this message to play Battleship', account])
        setAuthSig(signature)
      } catch (err) {
        console.error('Signature error', err)
        deactivate()  
      } finally {
        setAuthenticating(false)
      }
    }
  }, [authSig, authenticating, library, account, deactivate])

  // reset auth signature when account is disconnected
  useEffect(() => {
    if (!account) {
      setAuthSig('')
    }
  }, [account])

  // expected chain
  const expectedChain: ChainInfo = useMemo(() => {
    return NETWORKS[process.env.REACT_APP_NETWORK!] || NETWORKS.local
  }, [])

  // unsupported chain
  const unsupportedChain = useMemo(() => {
    return !canonicalChainId || expectedChain.chainId !== (canonicalChainId as ChainId)
  }, [canonicalChainId, expectedChain])

  return (
    <GlobalContext.Provider value={{
      theme,
      account,
      authSig,
      expectedChain,
      currentChain,
      genesisBlockHash,
      unsupportedChain,
    }}>
      {children}
    </GlobalContext.Provider>
  )
}

export const GlobalConsumer = GlobalContext.Consumer