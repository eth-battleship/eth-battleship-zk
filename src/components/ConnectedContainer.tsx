import React, { useContext, useMemo } from 'react'
import { useCloud, useGlobal } from '../hooks'
import ErrorBox from './ErrorBox'

export interface ContextValue {
  walletConnected: boolean,
  cloudConnected: boolean,
  cloudConnectionError?: string,
}

const Context = React.createContext({} as ContextValue)

export const ConnectedContainer: React.FunctionComponent = ({ children }) => {
  const { connected: cloudConnected, connectError: cloudConnectionError } = useCloud()
  const { unsupportedChain, account, authSig, currentChain } = useGlobal()
  
  const walletConnected = useMemo(() => {
    return !!(account && authSig && !unsupportedChain && currentChain)
  }, [account, authSig, currentChain, unsupportedChain])

  return (
    <Context.Provider value={{ 
      walletConnected, 
      cloudConnected,
      cloudConnectionError 
    }}>
      {children}
    </Context.Provider>
  )
}

export const Connected: React.FunctionComponent = ({ children }) => {
  const { walletConnected, cloudConnected } = useContext(Context)
  return (walletConnected && cloudConnected) ? <React.Fragment>{children}</React.Fragment> : null
}

export const WalletNotConnected: React.FunctionComponent = ({ children }) => {
  const { walletConnected } = useContext(Context)
  return walletConnected ? null : <React.Fragment>{children}</React.Fragment>
}

export const CloudNotConnected: React.FunctionComponent = ({ children }) => {
  const { cloudConnected } = useContext(Context)
  return cloudConnected ? null : <React.Fragment>{children}</React.Fragment>
}

interface Props {
  className?: string
}

export const CloudConnectionError: React.FunctionComponent<Props> = ({ className }) => {
  const { cloudConnectionError } = useContext(Context)
  return cloudConnectionError ? <ErrorBox className={className}>{cloudConnectionError}</ErrorBox> : null
}

