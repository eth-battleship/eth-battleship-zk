import { UseProgressHook } from "../hooks"

export interface Step {
  label: string,
  callback: () => Promise<unknown>,
  done: boolean,
}

export class Flow {
  public steps: Step[] = []
  private progress: UseProgressHook | undefined

  constructor(progress: UseProgressHook) {
    this.progress = progress
  }

  add(label: string, callback: () => Promise<unknown>) {
    this.steps.push({
      label,
      callback,
      done: false
    })
  }

  async run() {
    this.progress?.reset()

    let error = undefined

    for (let i = 0; i < this.steps.length; i += 1) {
      try {
        this.progress?.setActiveStep(this.steps[i].label)
        await this.steps[i].callback()
      } catch (err) {
        error = new Error(`Error [${this.steps[i].label}]: ${(err as Error).message}`)
        break
      }
    }

    if (error) {
      this.progress?.setError(error)
      throw error
    } else {
      this.progress?.setCompleted()
    }
  }
}