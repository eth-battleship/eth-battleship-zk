import React from 'react'
import styled from '@emotion/styled'

const Container = styled.div`
  display: inline-block;
  background-color: ${(p: any) => p.theme.progressTextBox.bgColor};
  color: ${(p: any) => p.theme.progressTextBox.textColor};
  padding: 0.2em 0.5em;
`

interface Props {
  className?: string
}

const ProgressTextBox: React.FunctionComponent<Props> = ({ className, children }) => (
  <Container className={className}>
    {children}
  </Container>
)

export default ProgressTextBox