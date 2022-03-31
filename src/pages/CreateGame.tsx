import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '../components/Layout'
import SetupGameBoard from '../components/SetupGameBoard'
import { useContract, useContractFunctionV2 } from '../hooks'

const SHIP_LENGTHS = [5, 4, 3, 3, 2]

const CreateGame: React.FunctionComponent = () => {
  const navigate = useNavigate()

  const contract = useContract()
  const contractCall = useContractFunctionV2({ contract, functionName: 'newGame' })

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
      <SetupGameBoard
        boardLength={10}
        shipLengths={SHIP_LENGTHS}
        onDone={createGame}
      />
    </Layout>
  )
}

export default CreateGame