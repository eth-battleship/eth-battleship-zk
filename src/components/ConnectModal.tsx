import React, { useEffect, useMemo } from 'react'
import styled from '@emotion/styled'
import { flex } from 'emotion-styled-utils'

import BaseModal, { ModalProps } from './Modal'
import Button from './Button'
import { useEthers } from '@usedapp/core'
import { useGlobal } from '../hooks'

const HEIGHT = '200px'

const Container = styled.div`
  ${flex({ direction: 'column', justify: 'space-around', align: 'center' })};
  padding: 2rem 1rem;
`

const ConnectModal: React.FunctionComponent<ModalProps> = ({ isOpen, onRequestClose }) => {
  const { account } = useGlobal()
  const { activateBrowserWallet } = useEthers()

  useEffect(() => {
    if (isOpen && account) {
      onRequestClose && onRequestClose()
    }
  }, [ account, isOpen, onRequestClose ])

  return (
    <BaseModal isOpen={isOpen} width='500px' height={HEIGHT} onRequestClose={onRequestClose}>
      <Container>
        <Button onClick={activateBrowserWallet}>Connect browser wallet</Button>
      </Container>
    </BaseModal>
  )
}

export default ConnectModal