import React, { useCallback, useMemo, useState } from 'react'
import styled from '@emotion/styled'

import Button from './Button'
import DisconnectModal from './DisconnectModal'
import SelectNetworkModal from './SelectNetworkModal'
import { useGlobal } from '../hooks'
import TruncatedAccount from './TruncatedAccount'
import { useEthers } from '@usedapp/core'

const Container = styled.div``

const WalletButton = styled(Button)`
  font-size: 0.8rem;
`

interface BadChainProps {
  switchNetwork: ()=> void,
}

const BadChain: React.FunctionComponent<BadChainProps> = ({ switchNetwork }) => {
  return (
    <Button onClick={switchNetwork}>Switch network</Button>
  )
}

interface GoodChainProps {
  connect: ()=> void,
  disconnect: ()=> void,
  account: string | null | undefined,
}

const GoodChain: React.FunctionComponent<GoodChainProps> = ({ connect, disconnect, account }) => {
  return account ? (
    <WalletButton onClick={disconnect}>Connected: <TruncatedAccount account={account} /></WalletButton>
  ) : (
    <Button onClick={connect}>Connect wallet</Button>
  )
}

const WalletInfo: React.FunctionComponent = () => {
  const { activateBrowserWallet } = useEthers()
  const { unsupportedChain, account } = useGlobal()
  const [showDisconnectModal, setShowDisconnectModal ] = useState<boolean>(false)
  const [showSwitchNetworkModal, setShowSwitchNetworkModal] = useState<boolean>(false)

  const connect = useCallback(() => {
    if (account) {
      return
    }
    activateBrowserWallet()
  }, [account, activateBrowserWallet])

  const disconnect = useCallback(() => {
    if (!account) {
      return
    }
    setShowDisconnectModal(true)
  }, [account])

  const switchNetwork = useCallback(() => {
    setShowSwitchNetworkModal(true)
  }, [])

  const hideModals = useCallback(() => {
    setShowDisconnectModal(false)
    setShowSwitchNetworkModal(false)
  }, [])

  return (
    <Container>
      {(unsupportedChain && account) ? (
        <BadChain switchNetwork={switchNetwork}/>
      ) : (
        <GoodChain connect={connect} disconnect={disconnect} account={account} />
      )}
      <DisconnectModal
        onRequestClose={hideModals}
        isOpen={showDisconnectModal}
      />
      <SelectNetworkModal
        onRequestClose={hideModals}
        isOpen={showSwitchNetworkModal}
      />
    </Container>
  )
}


export default WalletInfo

