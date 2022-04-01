import styled from '@emotion/styled'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '../components/Layout'
import SetupGameBoard from '../components/SetupGameBoard'
import { useContract, useContractFunctionV2 } from '../hooks'

const SHIP_LENGTHS = [5, 4, 3, 3, 2]

const H1 = styled.h1`
  margin-bottom: 2rem;
`

const StyledSetupGameBoard = styled(SetupGameBoard)`
  margin-top: 2rem;
`

const CreateGame: React.FunctionComponent = () => {
  const navigate = useNavigate()

  const contract = useContract()
  const contractCall = useContractFunctionV2({ contract, functionName: 'newGame' })

  const onBoardChange = useCallback(() => {}, [])

  const createGame = useCallback(async () => {
    // await contractCall.exec(
    //   ,
    //   10,
    //   20,

    //   to.value,
    //   toHexPrefixedWith0x(design.value as number, { pad: true }),
    //   message.value,
    //   tokens.length,
    //   tokens.map(({ value }) => (value as Balance).token!.address),
    //   tokens.map(({ value }) => balanceToBigVal(value as Balance).toMinScale().toString()),
    //   {
    //     value: balanceToBigVal(eth.value).toMinScale().toString(),
    //   }
    // )

    navigate("/new")
  }, [navigate])

  return (
    <Layout>
      <H1>Create game</H1>
      <p>Select the ships below and place them on the board.</p>
      <StyledSetupGameBoard
        boardLength={10}
        shipLengths={SHIP_LENGTHS}
        onChange={onBoardChange}
      />
    </Layout>
  )
}

export default CreateGame