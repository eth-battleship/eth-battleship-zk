import { useCallback, useState } from "react"

export interface UseProgressHook {
  inProgress?: boolean,
  activeStep?: any,
  completed?: boolean,
  error?: Error,
  setActiveStep: (v: any)=> void,
  setCompleted: ()=> void,
  setError: (e: Error)=> void,
  reset: ()=> void,
}

/**
 * Asynchronous action progress indicator.
 */
export const useProgress = (): UseProgressHook => {
  const [inProgress, setInProgressState] = useState<boolean>()
  const [activeStep, setActiveStepState] = useState<any>()
  const [completed, setCompletedState] = useState<boolean>(false)
  const [error, setErrorState] = useState<Error>()

  const reset = useCallback(() => {
    setInProgressState(false)
    setActiveStepState(undefined)
    setErrorState(undefined)
    setCompletedState(false)
  }, [])

  const setCompleted = useCallback(() => {
    setInProgressState(false)
    setActiveStepState(undefined)
    setCompletedState(true)
  }, [])

  const setError = useCallback((e: Error) => {
    setInProgressState(false)
    setActiveStepState(undefined)
    setErrorState(e)
  }, [])

  const setActiveStep = useCallback((v: any) => {
    setInProgressState(true)
    setActiveStepState(v)
  }, [])

  return { 
    inProgress,
    activeStep,
    completed,
    error,
    setCompleted,
    setError,
    setActiveStep,
    reset,
  }
}
