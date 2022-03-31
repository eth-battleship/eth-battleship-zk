import path from 'path'
import fs from 'fs'
import delay from 'delay'
import { ethers, artifacts } from 'hardhat'
import { createLog } from './log'
import { getMatchingNetwork, buildGetTxParamsHandler, getSigners, verifyOnEtherscan, deployContract } from './utils'
import { deployMulticall } from './multicall'
import { Contract } from '@ethersproject/contracts'

const deployedAddressesJsonFilePath = path.join(__dirname, '..', 'src', 'contracts', 'addresses.json')
const deployedAddresses = require(deployedAddressesJsonFilePath)

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
    let battleship: Contract

    let multicall: Contract
    if (network.name === 'localhost') {
      multicall = await deployMulticall(ctx)
    }

    await parentTask.task('Deploy Battleship contract', async (task: any) => {
      battleship = await deployContract(ctx, 'Battleship', [])
      await task.log(`Deployed at ${battleship.address}`)
    })

    await parentTask.task('Write contract address to src/ folder', async (task: any) => {
      deployedAddresses[network.chainId!] = {
        Battleship: battleship.address
      }

      if (multicall) {
        deployedAddresses[network.chainId!].Multicall = multicall.address
      }

      fs.writeFileSync(deployedAddressesJsonFilePath, JSON.stringify(deployedAddresses, null, 2), 'utf-8')
    })

    await parentTask.task('Write contract ABI to src/ folder', async (task: any) => {
      await task.log(`Loading ABI json from build artifact ...`)
      const cjs = fs.readFileSync(path.join(__dirname, '..', 'artifacts', 'contracts', 'Battleship.sol', 'Battleship.json'), 'utf-8')
      await task.log(`Writing ABI json file ...`)
      fs.writeFileSync(
        path.join(__dirname, '..', 'src', 'contracts', 'abi.json'),
        JSON.stringify(JSON.parse(cjs).abi, null, 2),
        'utf-8'
      )
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