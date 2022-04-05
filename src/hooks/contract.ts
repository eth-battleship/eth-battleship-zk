import { TransactionReceipt } from '@ethersproject/providers'
import { Contract } from "@ethersproject/contracts"
import { TransactionOptions, useContractFunction, useEthers } from "@usedapp/core"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ADDRESSES, ABI } from "../lib/contract"
import { ADDRESS_ZERO } from "../lib/utils"
import { useGlobal, useProgress, UseProgressHook } from "./"

type UseContractHook = Contract

export const useContract = (): UseContractHook => {
  const { currentChain } = useGlobal()
  const { library } = useEthers()
  const address = useMemo(() => {
    if (!currentChain) {
      return ADDRESS_ZERO
    }
    if (!ADDRESSES[currentChain.chainId]) {
      throw new Error(`Contract address not found for network: ${currentChain.chainName}`)
    }
    return ADDRESSES[currentChain.chainId].Battleship
  }, [currentChain])
  return new Contract(address, ABI, library)
}

interface UseContractFunctionV2Hook {
  exec: (...args: any[]) => Promise<TransactionReceipt>,
  progress: UseProgressHook,
}

interface UseContractFunctionV2Input {
  contract: Contract,
  functionName: string,
  options?: TransactionOptions,
  progress?: UseProgressHook,
}

interface PromiseResolvers {
  resolve: (v: any)=> void,
  reject: (e: Error)=> void,
}

export const useContractFunctionV2 = (opts: UseContractFunctionV2Input): UseContractFunctionV2Hook => {
  const { contract, functionName, options, progress: inputProgress } = opts

  const selfProgress = useProgress()
  const progress = useMemo(() => inputProgress || selfProgress, [inputProgress, selfProgress])

  const { send, state, resetState } = useContractFunction(
    contract, functionName, {
    transactionName: functionName,
    ...options,
  }
  )

  const [promiseResolvers, setPromiseResolvers] = useState<PromiseResolvers>()

  const exec = useCallback(async (...args): Promise<TransactionReceipt> => {
    resetState()
    progress.reset()

    progress.setActiveStep('sending')
    send(...args)

    return new Promise((resolve, reject) => {
      setPromiseResolvers({ resolve, reject })
    })
  }, [progress, resetState, send])

  const error = useMemo(() => state?.errorMessage ? new Error(state?.errorMessage) : null, [state])
  const completed = useMemo(() => (state?.status === 'Success') && !error, [error, state?.status])
  const mining = useMemo(() => (state?.status === 'Mining') && !error, [state?.status, error])

  useEffect(() => {
    if (mining) {
      progress.setActiveStep('mining')
    } else if (completed || error) {
      if (completed) {
        progress.setCompleted()
        promiseResolvers?.resolve(state.receipt)
      } if (error) {
        progress.setError(error)
        promiseResolvers?.reject(error)
      }

      setPromiseResolvers(undefined)
    }
  }, [completed, error, mining, progress, promiseResolvers, state.receipt])

  return {
    exec,
    progress,
  }
}

