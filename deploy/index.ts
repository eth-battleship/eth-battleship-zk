import delay from 'delay'
import { ethers, artifacts } from 'hardhat'
import { createLog } from './log'
import { getMatchingNetwork, buildGetTxParamsHandler, getSigners, verifyOnEtherscan, deployContract } from './utils'

async function main() {
  const log = createLog(console.log.bind(console))

  const network = getMatchingNetwork(await ethers.provider.getNetwork())

  console.log(`Network: ${network.name} (chainId: ${network.chainId})`)

  if (network.name === 'hardhat') {
    network.name = 'localhost'
  }

  const signers = await getSigners()

  let defaultSigner = signers[0]

  console.log(`Deploying from: ${defaultSigner.address}`)

  const getTxParams = await buildGetTxParamsHandler(network, defaultSigner, { log })

  const ctx = {
    artifacts,
    signers,
    defaultSigner,
    log,
    network,
    getTxParams,
  }
  
  await log.task(`Deploy`, async (parentTask: any) => {
    let battleship: any

    await parentTask.task('Deploy Battleship contract', async (task: any) => {
      battleship = await deployContract(ctx, 'Battleship', [])
      await task.log(`Deployed at ${battleship.address}`)
    })

    // for rinkeby let's verify contract on etherscan
    if (network.name === 'rinkeby') {
      await parentTask.task('Verify contracts on Etherscan', async (task: any) => {
        const secondsToWait = 60
        await task.log(`Waiting ${secondsToWait} seconds for Etherscan backend to catch up`)
        await delay(secondsToWait * 1000)

        await Promise.all([
          {
            contract: 'contracts/Game.sol:Game',
            address: battleship.address,
            constructorArgs: [],
          },
        ].map(a => (
          verifyOnEtherscan({
            task,
            name: a.contract,
            args: {
              contract: a.contract,
              network: network.name,
              address: a.address,
              constructorArguments: a.constructorArgs,
            },
          })
        )))
      })
    }
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })