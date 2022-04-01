import chalk from 'chalk'

type TaskFunction = (l: Logger) => Promise<any>

type LogFunction = (msg: any, c?: any)=> void

export interface Logger {
  log: LogFunction,
  task: (name: string, fn: TaskFunction, opts?: any) => Promise<any>,
}

export const createLog = (logger: any): Logger => {
  // @ts-ignore
  const logMsg = logger ? (msg: string, col = 'blue') => logger(chalk[col].call(chalk, msg)) : () => { }
  let step = 0

  const taskFn = async (name: string, fn: TaskFunction, { pad = ' ', col = 'cyan' }: any = {}): Promise<any> => {
    const num = ++step
    logMsg(`[${num}]${pad}BEGIN: ${name} ...`, col)

    const ret: any = await fn({
      log: (msg:string, c: string) => logMsg(`[${num}]${pad} ${msg}`, c || col),
      task: (n, f, opts = {}) => taskFn(n, f, { ...opts, pad: `${pad}  ` })
    })

    logMsg(`[${num}]${pad}...END: ${name}`, col)

    return ret
  }

  return {
    log: logMsg,
    task: taskFn,
  }
}
