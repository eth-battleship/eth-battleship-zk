import React from 'react'
import styled from '@emotion/styled'

import SuccessBox from './SuccessBox'
import LoadingIcon from './LoadingIcon'

const Div = styled(SuccessBox)`
  background-color: ${(p: any) => p.theme.progressBox.bgColor};
  color: ${(p: any) => p.theme.progressBox.textColor};
`

interface Props {
  className?: string
}

const ProgressBox: React.FunctionComponent<Props> = ({ className, children }) => (
  <Div className={className}>
    <LoadingIcon />
    {children}
  </Div>
)

export default ProgressBox