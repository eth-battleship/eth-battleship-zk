import React from 'react'
import styled from '@emotion/styled'
import { Link } from 'react-router-dom'
import { flex } from 'emotion-styled-utils'

import WalletInfo from './WalletInfo'
import { Connected, ConnectedContainer, NotConnected } from './ConnectedContainer'
import { useGlobal } from '../hooks'
import ErrorBox from './ErrorBox'
import MaxContentWidth from './MaxContentWidth'


export const headerHeight = '100px'

const Container = styled.div`
  background-color: ${(p: any) => p.theme.layout.bgColor};
  color: ${(p: any) => p.theme.layout.textColor};
  width: 100vw;
  min-height: 100vh;
`

const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: ${headerHeight};
  background-color: ${(p: any) => p.theme.header.bgColor};
  color: ${(p: any) => p.theme.header.textColor};

  & > div {
    ${flex({ direction: 'row', justify: 'space-between', align: 'center' })};
    padding: 0 1rem;
    height: ${headerHeight};
  }

  button {
    padding: 0.4em 0.7em;
  }

  sup {
    font-size: 50%;
    position: relative;
    bottom: 10px;
  }
`

const Content = styled(MaxContentWidth)`
  width: 100%;
  padding: 1rem;
  padding-top: calc(${headerHeight} + 2rem);
  height: 100%;
`

const Footer = styled.footer`
  background-color: ${(p: any) => p.theme.footer.bgColor};
  color: ${(p: any) => p.theme.footer.textColor};
  margin-top: 3rem;
  padding: 1rem 1rem;
  font-size: 0.7rem;
  text-align: center;
`


const Layout: React.FunctionComponent = ({ children }) => {
  const { expectedChain } = useGlobal()

  return (
    <Container>
      <Header>
        <MaxContentWidth>
          <Link to="/">Battleship<sup>ZK</sup></Link>
          <WalletInfo />
        </MaxContentWidth>
      </Header>
      <Content>
        <ConnectedContainer>
          <Connected>{children}</Connected>
          <NotConnected>
            <ErrorBox>
              Please connect your Ethereum wallet to {expectedChain.chainName} to view this page ↗
            </ErrorBox>
          </NotConnected>
        </ConnectedContainer>
      </Content>
      <Footer>
        <MaxContentWidth>
          made by <a href="https://hiddentao.com">hiddentao</a> / view <a href="https://github.com/eth-battleship/eth-battleship.github.io">source on Github</a>
        </MaxContentWidth>
      </Footer>
    </Container>
  )
}

export default Layout

