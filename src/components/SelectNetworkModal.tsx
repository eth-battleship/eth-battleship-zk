import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styled from '@emotion/styled'
import { flex } from 'emotion-styled-utils'

import BaseModal, { ModalProps } from './Modal'
import Button from './Button'
import { ChainId, useEthers } from '@usedapp/core'
import { useGlobal } from '../hooks'
import { toHexPrefixedWith0x } from '../lib/utils'
import { NETWORKS } from '../lib/chain'

const HEIGHT = '200px'

const Container = styled.div`
  ${flex({ direction: 'column', justify: 'space-around', align: 'center' })};
  padding: 2rem 1rem;
`

const ConnectModal: React.FunctionComponent<ModalProps> = ({ isOpen, onRequestClose }) => {
  const { library } = useEthers()
  const { currentChain, expectedChain } = useGlobal()
  const [ connectingToNetwork, setConnectingToNetwork ] = useState<ChainId | undefined>()

  useEffect(() => {
    if (currentChain && currentChain.chainId === connectingToNetwork) {
      onRequestClose && onRequestClose()
    }
  }, [connectingToNetwork, onRequestClose, currentChain])

  const switchToNetwork = useCallback(async (chainId: ChainId) => {
    if (!library) {
      return
    }

    setConnectingToNetwork(chainId)

    try {
      await library.send('wallet_switchEthereumChain', [{ chainId }])
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          const chain = Object.values(NETWORKS).find(({ chainId: id }) => id === chainId)          
          await library.send('wallet_addEthereumChain', [
            { 
              ...chain!, 
              chainId: toHexPrefixedWith0x(chainId)
            }
          ])
        } catch (addError: any) {
          window.alert(addError.toString())
        }
      }
    }
  }, [library])

  return (
    <BaseModal isOpen={isOpen} width='500px' height={HEIGHT} onRequestClose={onRequestClose}>
      <Container>
        <p>Select network</p>
        <Button onClick={() => switchToNetwork(expectedChain.chainId)}>{expectedChain.chainName}</Button>
      </Container>
    </BaseModal>
  )
}

export default ConnectModal