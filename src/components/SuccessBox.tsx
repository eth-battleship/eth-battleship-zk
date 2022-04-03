import React from 'react'
import styled from '@emotion/styled'

const Container = styled.div`
  display: block;
  background-color: ${(p: any) => p.theme.successBox.bgColor};
  color: ${(p: any) => p.theme.successBox.textColor};
  padding: 0.6em;
`

interface Props {
  className?: string
}

const SuccessBox: React.FunctionComponent<Props> = ({ className, children }) => (
  <Container className={className}>
    {children}
  </Container>
)

export default SuccessBox