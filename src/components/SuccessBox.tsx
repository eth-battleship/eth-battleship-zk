import React from 'react'
import styled from '@emotion/styled'
import ProgressTextBox from './ProgressTextBox'

const SuccessBox = styled(ProgressTextBox)`
  background-color: ${(p: any) => p.theme.successBox.bgColor};
  color: ${(p: any) => p.theme.successBox.textColor};
`

export default SuccessBox