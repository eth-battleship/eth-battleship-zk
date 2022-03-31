import React, { useEffect, useMemo } from 'react'
import styled from '@emotion/styled'
import { flex } from 'emotion-styled-utils'

import BaseModal, { ModalProps } from './Modal'
import Button from './Button'
import { useEthers } from '@usedapp/core'
import { useGlobal } from '../hooks'

const Container = styled.div`
  ${flex({ direction: 'column', justify: 'space-around', align: 'center' })};
  padding: 2rem 1rem;

  p {
    text-align: center;
  }

  button {
    margin-top: 1.5rem;
  }
`

const Title = styled.p`
  ${(p: any) => p.theme.font('header')};
  font-size: 1.4rem;
  margin-bottom: 1rem;
`

const Account = styled.p`
  font-family: monospace;
  font-size: 0.8rem;
`

const ConnectModal: React.FunctionComponent<ModalProps> = ({ isOpen, onRequestClose }) => {
  const { account } = useGlobal()
  const { deactivate } = useEthers()

  useEffect(() => {
    if (isOpen && !account) {
      onRequestClose && onRequestClose()
    }
  }, [ account, isOpen, onRequestClose ])

  return (
    <BaseModal isOpen={isOpen} width='500px' height='230px' onRequestClose={onRequestClose}>
      <Container>
        <Title>Connected wallet</Title>
        <Account>{account}</Account>
        <Button onClick={deactivate}>Disconnect</Button>
      </Container>
    </BaseModal>
  )
}

export default ConnectModal
