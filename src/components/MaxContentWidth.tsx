import React from 'react'
import styled from '@emotion/styled'

const Container = styled.div`
  width: 100%;
  max-width: ${(p: any) => p['data-width'] || '100%'};
  margin: 0 auto;
`

interface Props {
  className?: string
}

const MaxContentWidth: React.FunctionComponent<Props> = ({ className, children }) => (
  <Container data-width='1024px' className={className}>
    {children}
  </Container>
)

export default MaxContentWidth