import React from 'react'
import styled from '@emotion/styled'
import { flex, childAnchors } from 'emotion-styled-utils'

const Container = styled.div`
  font-size: 1rem;
  word-break: break-all;
`

const ErrorDiv = styled.div` 
  ${flex({ direction: 'row', justify: 'flex-start' })};
  background-color: ${(p: any) => p.theme.errorBox.bgColor};
  color: ${(p: any) => p.theme.errorBox.textColor};
  padding: 0.6em;
  border-radius: 5px;
  margin-top: 0.2rem;

  *:first-of-type {
    margin-top: 0;
  }

  ${(p: any) => childAnchors(p.theme.errorBox.anchor)};
`

const Details = styled.div`
  ${(p: any) => p.theme.font('body')};
  width: 90%;
  line-height: 1.2em;
`

const Msg = styled.div`
  font-size: 100%;
`

const SubMsg = styled.p`
  font-size: 90%;
  margin: 0.5em 0 0 1em;
`

interface Props {
  className?: string,
  error?: any,
}

const ErrorBox: React.FunctionComponent<Props> = ({ className, children, error }) => {
  let err

  if (children) {
    err = [children]
  } else {
    err = (!Array.isArray(error) ? [error] : error)
  }

  return (
    <Container className={className}>
      {err.map(e => (
        <ErrorDiv key={`${e}`}>
          <Details>
            <Msg>{e.message || e}</Msg>
            {e.details ? e.details.map((d: any) => (
              <SubMsg key={`${d}`}>- {`${d}`}</SubMsg>
            )) : null}
          </Details>
        </ErrorDiv>
      ))}
    </Container>
  )
}

export default ErrorBox