import React, { useState, useMemo, useEffect } from 'react'
import { useEthers, ChainId } from '@usedapp/core'
import { setFonts } from 'emotion-styled-utils'

import { setupThemes } from '../themes'
import { NETWORKS } from '../lib/chain'
import { toHexPrefixedWith0x } from '../lib/utils'

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
  canonicalChainId: number | null,
  userAddress: string | undefined,
  nativeTokenName: string,
  unsupportedChain: boolean,
}

export const GlobalContext = React.createContext({} as GlobalContextValue);

export const GlobalProvider: React.FunctionComponent = ({ children }) => {
  // theme
  const [themeName] = useState('default')
  const [canonicalChainId, setCanonicalChainId] = useState<number | null>(null)
  const [userAddress, setUserAddress] = useState<string>()
  const theme = useMemo(() => themes.get(themeName), [themeName])

  // web3
  const { account, chainId, library } = useEthers()

  // get correct chain id
  useEffect(() => {
    (async () => {
      try {
        setCanonicalChainId(null)
        const chainIdHexString = await library?.send('eth_chainId', [])
        setCanonicalChainId(chainIdHexString ? parseInt(chainIdHexString, 16) : null)
      } catch (err) {
        console.error(`Error resolving canonical chain id`, err)
      }
    })()
  }, [chainId, library])

  // get signer address
  useEffect(() => {
    (async () => {
      let a

      try {
        a = await (library?.getSigner())?.getAddress()
      } catch (err) {
        // error resolving user address
      } finally {
        setUserAddress(a)
      }
    })()
  }, [chainId, library])

  // unsupported chain
  const unsupportedChain = useMemo(() => {
    const expectedChainId: ChainId = parseInt(NETWORKS[CONFIG.NETWORK].chainId, 16)
    return !canonicalChainId || ![expectedChainId].includes(canonicalChainId as ChainId)
  }, [canonicalChainId])

  const nativeTokenName = useMemo(() => {
    if (!canonicalChainId) {
      return ''
    }

    const chain = Object.values(NETWORKS).find(({ chainId }) => chainId === toHexPrefixedWith0x(canonicalChainId))

    if (!chain) {
      return ''
    }

    return chain.nativeCurrency.symbol
  }, [canonicalChainId])

  return (
    <GlobalContext.Provider value={{
      theme,
      account,
      unsupportedChain,
      canonicalChainId,
      userAddress,
      nativeTokenName,
    }}>
      {children}
    </GlobalContext.Provider>
  )
}

export const GlobalConsumer = GlobalContext.Consumer