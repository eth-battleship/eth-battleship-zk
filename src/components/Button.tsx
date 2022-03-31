import React, { useCallback, useMemo } from 'react'
import styled from '@emotion/styled'
import { buttonStyles } from 'emotion-styled-utils'

import { ButtonProps } from './interfaces'
import LoadingIcon from './LoadingIcon'

const StyledButton = styled.button`
  ${(p: any) => p.theme.font('body', 'light')};
  font-size: 1.2rem;
  padding: 1em 2em;
  border-radius: 5px;

  ${({ disabled, ...p }) => buttonStyles({
    ...(p.theme as any).button,
    inDisabledState: disabled,
  })};
`

const Content = styled.div`
  display: inline-block;
`

const Button: React.FunctionComponent<ButtonProps> = ({ children, loading, disabled, onClick, ...props }) => {
  const isDisabled = useMemo(() => disabled || loading, [ disabled, loading ])

  const onClickPreventDefault = useCallback(e => {
    e.preventDefault()
    if (isDisabled) {
      return
    }
    if (onClick) {
      onClick()
    }
  }, [isDisabled, onClick])

  return (
    <StyledButton {...props} disabled={isDisabled} onClick={onClickPreventDefault}>
      {loading ? <LoadingIcon /> : (
        children ? <Content>{children}</Content> : null
      )}
    </StyledButton>
  )
}

export default Button



