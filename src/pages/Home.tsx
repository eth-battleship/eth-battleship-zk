import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

import Layout from '../components/Layout'

const Page: React.FunctionComponent = () => {
  const navigate = useNavigate()

  const createGame = useCallback(async () => {
    navigate("/create")
  }, [navigate])

  return (
    <React.Fragment>
      <Button onClick={createGame}>Create game</Button>
    </React.Fragment>
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