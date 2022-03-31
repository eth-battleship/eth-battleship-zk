import React from 'react'
import styled from '@emotion/styled'
import { Link } from 'react-router-dom'
import { flex } from 'emotion-styled-utils'
import WalletInfo from './WalletInfo'

export const headerHeight = '100px'

const Container = styled.div`
  background-color: ${(p: any) => p.theme.layout.bgColor};
  color: ${(p: any) => p.theme.layout.textColor};
  width: 100vw;
  min-height: 100vh;
`

const Header = styled.header`
  ${flex({ direction: 'row', justify: 'space-between', align: 'center' })};
  position: fixed;
  top: 0;
  left: 0;
  padding: 0 1rem;
  width: 100vw;
  height: ${headerHeight};
  background-color: ${(p: any) => p.theme.header.bgColor};
  color: ${(p: any) => p.theme.header.textColor};

  button {
    padding: 0.4em 0.7em;
  }
`

const Content = styled.main`
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
  return (
    <Container>
      <Header>
        <Link to="/">ZK Battleship</Link>
        <WalletInfo />
      </Header>
      <Content>
        {children}
      </Content>
      <Footer>
        made by <a href="https://hiddentao.com">hiddentao</a> / view <a href="https://github.com/eth-battleship/eth-battleship.github.io">source on Github</a>
      </Footer>
    </Container>
  )
}

export default Layout

