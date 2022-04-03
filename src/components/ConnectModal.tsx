import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styled from '@emotion/styled'
import { flex } from 'emotion-styled-utils'

import BaseModal, { ModalProps } from './Modal'
import Button from './Button'
import { useEthers } from '@usedapp/core'
import { useGlobal } from '../hooks'

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
    <BaseModal isOpen={isOpen} width='500px' height='150px' onRequestClose={onRequestClose}>
      <Container>
        <Button onClick={activateBrowserWallet}>Connect browser wallet</Button>
      </Container>
    </BaseModal>
  )
}

export default ConnectModal
