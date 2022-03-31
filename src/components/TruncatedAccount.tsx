import React, { useMemo } from 'react'

interface Props {
  account: string,
}

const TruncatedAccount: React.FunctionComponent<Props> = ({ account }) => {
  const trunc = useMemo(() => {
    if (account.startsWith('0x')) {
      return `${account.substring(2, 6)}..${account.substring(account.length - 4, account.length)}`
    } else {
      return ''
    }
  }, [ account ])

  return <span>{trunc}</span>
}

export default TruncatedAccount