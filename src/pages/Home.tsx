import styled from '@emotion/styled'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

import Layout from '../components/Layout'
import LoadingIcon from '../components/LoadingIcon'
import TruncatedAccount from '../components/TruncatedAccount'
import { useCloud } from '../hooks'
import { gameStatusToText } from '../lib/game'

const Container = styled.div`
  h2 {
    margin-top: 3rem;
  }

  table {
    th {
      text-align: left;
      ${(p: any) => p.theme.font('heading', 'bold')}
      padding: 1em 2em 1em 0;
    }

    td {
      padding: 1em 2em 1em 0;
      text-align: left;
    }

    tbody {
      tr:hover {
        background-color: ${(p: any) => p.theme.gameList.hover.bgColor};
        cursor: pointer;
      }

      button {
        font-size: 0.8em;
      }
    }
  }
`

const Page: React.FunctionComponent = () => {
  const navigate = useNavigate()
  const { gameList } = useCloud()

  const createGame = useCallback(async () => {
    navigate("/create")
  }, [navigate])

  const playGame = useCallback(async (id: any) => {
    navigate(`/view/${id}`)
  }, [navigate])

  return (
    <Container>
      <Button onClick={createGame}>Create game</Button>
      <h2>Existing games</h2>
      {gameList ? (
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>started</th>
              <th>player1</th>
              <th>player2</th>
              <th>status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gameList.map(v => (
              <tr key={v.id} onClick={() => playGame(v.id)}>
                <td>{v.id}</td>
                <td>{new Date(v.created).toDateString()}</td>
                <td><TruncatedAccount account={v.player1} /></td>
                <td><TruncatedAccount account={v.player2 || '-'} /></td>
                <td>{gameStatusToText(v.status)}</td>
                <td><Button onClick={() => playGame(v.id)}>View</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <LoadingIcon />
      )}
    </Container>
  )
}

const Home: React.FunctionComponent = () => {
  return (
    <Layout>
      <Page />
    </Layout>
  )
}

export default Home