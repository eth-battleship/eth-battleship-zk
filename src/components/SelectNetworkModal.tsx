import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styled from '@emotion/styled'
import { flex } from 'emotion-styled-utils'

import BaseModal, { ModalProps } from './Modal'
import Button from './Button'
import { ChainId, useEthers } from '@usedapp/core'
import { useGlobal } from '../hooks'
import { toHexPrefixedWith0x } from '../lib/utils'
import { NETWORKS } from '../lib/chain'

const Container = styled.div`
  ${flex({ direction: 'column', justify: 'space-around', align: 'center' })};
  padding: 2rem 1rem;

  p {
    ${(p: any) => p.theme.font('header')};
    font-size: 1.4rem;
    margin-bottom: 1rem;
  }
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
      await library.send('wallet_switchEthereumChain', [{ 
        chainId: toHexPrefixedWith0x(chainId) 
      }])
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          const chain = {
            ...Object.values(NETWORKS).find(({ chainId: id }) => id === chainId),
            chainId: toHexPrefixedWith0x(chainId),
          }

          await library.send('wallet_addEthereumChain', [chain])
        } catch (addError: any) {
          window.alert(addError.toString())
        }
      }
    }
  }, [library])

  return (
    <BaseModal isOpen={isOpen} width='500px' height='200px' onRequestClose={onRequestClose}>
      <Container>
        <p>Choose network</p>
        <Button onClick={() => switchToNetwork(expectedChain.chainId)}>{expectedChain.chainName}</Button>
      </Container>
    </BaseModal>
  )
}

export default ConnectModal
