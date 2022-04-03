import { Interface } from '@ethersproject/abi'
import { TransactionReceipt  } from '@ethersproject/providers'

export const ADDRESSES = require('../contracts/addresses.json')
export const ABI = require('../contracts/abi.json')

export const extractNewGameIdFromTxReceipt = (receipt: TransactionReceipt): number => {
  const iface = new Interface(ABI)

  const match = receipt.logs
    .map(({ data, topics }) => iface.parseLog({ data, topics }))
    .find(({ name }) => name === 'NewGame')

  if (!match) {
    console.error(receipt)
    throw new Error('NewGame event not found in tx receipt')
  }

  return (match.args[0] as any).toNumber()
}