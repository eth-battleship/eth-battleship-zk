import delay from 'delay'
import { ethers, run } from 'hardhat'
import got from 'got'
import { Logger } from './log'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import cfg from '../hardhat.config'

const { networks } = cfg

interface Context {
  log: Logger
}

const defaultGetTxParams = (txParamsOverride = {}) => Object.assign({
  gasPrice: 1 * 1000000000, // 1 GWEI,
}, txParamsOverride)

let signers: SignerWithAddress[]
export const getSigners = async () => {
  if (!signers) {
    signers = (await ethers.getSigners())
  }
  return signers
}

export const deployContract = async ({ artifacts, getTxParams = defaultGetTxParams }: any, name: string, args: any[] = [], txOverrides: any = {}) => {
  const C = artifacts.require(name)
  const c = await C.new(...args, { ...getTxParams(txOverrides) })
  await delay(5000) // wait for endpoints to catch up
  return c
}

export const getMatchingNetwork = ({ chainId: id }: { chainId: number }) => {
  const match = Object.keys(networks!).find(k => networks![k]!.chainId === id)

  if (!match) {
    throw new Error(`Could not find matching network with id ${id}`)
  }

  return Object.assign({
    name: match,
    id,
  }, networks![match], {
    isLocal: (id === 31337)
  })
}

export const getLiveGasPrice = async ({ log }: Context): Promise<number> => {
  let gwei: number = 0

  await log.task('Fetching live fast gas price', async task => {
    const { body } = await got('https://www.ethgasstationapi.com/api/fast', { rejectUnauthorized: false })
    const fast = parseFloat(body)
    gwei = fast + 1
    task.log(`${gwei} GWEI`)
  })

  return gwei
}


export const buildGetTxParamsHandler = async (network: any, signer: SignerWithAddress, { log }: Context) => {
  // additional tx params (used to ensure enough gas is supplied alongside the correct nonce)
  let getTxParams

  if (!network.isLocal) {
    /*
    - On mainnet, use live gas price for max speed,
    - do manual nonce tracking to avoid infura issues (https://ethereum.stackexchange.com/questions/44349/truffle-infura-on-mainnet-nonce-too-low-error)
    */
    let gwei: number
    if ('mainnet' === network.name) {
      gwei = await getLiveGasPrice({ log })
    } else {
      gwei = 3
    }

    const address = await signer.getAddress()

    let nonce = await signer.getTransactionCount()

    getTxParams = (txParamsOverride = {}) => {
      log.log(`Nonce: ${nonce}`)

      nonce += 1

      return defaultGetTxParams(Object.assign({
        gasPrice: gwei * 1000000000,
        nonce: nonce - 1,
        from: address,
      }, txParamsOverride))
    }
  }

  return getTxParams
}

export const verifyOnEtherscan = async ({ task, name, args }: { task: Logger, name: string, args: any }) => {
  await task.task(`Verify on Etherscan: ${name}`, async t => {
    await t.log(JSON.stringify(args))
    try {
      await run("verify:verify", args)
    } catch (err: any) {
      if (!err.toString().includes('Already Verified')) {
        throw err
      } else {
        console.warn('ALREADY VERIFIED!')
      }
    }
  })
}
