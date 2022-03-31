import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

import Layout from '../components/Layout'

const Home: React.FunctionComponent = () => {
  const navigate = useNavigate()

  const createGame = useCallback(async () => {
    navigate("/create")
  }, [navigate])

  return (
    <Layout>
      <Button onClick={createGame}>Create game</Button>
    </Layout>
  )
}

export default Home