import React from 'react'
import { useParams } from 'react-router-dom'

import Layout from '../components/Layout'

const ViewGame: React.FunctionComponent = () => {
  const { gameId } = useParams()

  return (
    <Layout>
      view game {gameId}
    </Layout>
  )
}

export default ViewGame