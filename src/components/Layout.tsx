import React from 'react'
import styled from '@emotion/styled'
import { Link } from 'react-router-dom'

const Container = styled.div``
const Header = styled.header``
const Main = styled.main``
const GithubLink = styled.a``


const Layout: React.FunctionComponent = ({ children }) => {
  return (
    <Container>
      <Header>
        <Link to="/">ZK Battleship</Link>
        <GithubLink href="https://github.com/eth-battleship/eth-battleship.github.io">
          View source
        </GithubLink>
      </Header>
      <Main>
        {children}
      </Main>
    </Container>
  )
}

export default Layout