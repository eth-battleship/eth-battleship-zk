import React, { useContext, useMemo } from 'react'
import { useGlobal } from '../hooks'

export interface ContextValue {
  connected: boolean,
}

const Context = React.createContext({} as ContextValue)

export const ConnectedContainer: React.FunctionComponent = ({ children }) => {
  const { unsupportedChain, account, currentChain } = useGlobal()
  
  const connected = useMemo(() => {
    return !!(account && !unsupportedChain && currentChain)
  }, [account, currentChain, unsupportedChain])

  return (
    <Context.Provider value={{ connected }}>
      {children}
    </Context.Provider>
  )
}

export const Connected: React.FunctionComponent = ({ children }) => {
  const { connected } = useContext(Context)
  return connected ? <React.Fragment>{children}</React.Fragment> : null
}

export const NotConnected: React.FunctionComponent = ({ children }) => {
  const { connected } = useContext(Context)
  return connected ? null : <React.Fragment>{children}</React.Fragment>
}

