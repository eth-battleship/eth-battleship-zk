import React, { Fragment } from 'react'
import { css, Global, useTheme } from '@emotion/react'
import { resetStyles, smoothTransitions } from 'emotion-styled-utils'

const GlobalStyles: React.FunctionComponent = () => {
  const theme: any = useTheme()

  return (
    <Fragment>
      <Global styles={css(resetStyles)} />
      <Global styles={css`
        * {
          box-sizing: border-box;
          ${smoothTransitions({ duration: '0.1s' })};
        }

        html {
          font-size: 18px;
        }

        body {
          ${theme.font('body')};
        }

        a {
          cursor: pointer;
          text-decoration: none;
          border-bottom: 1px solid transparent;
        }

        h1, h2, h3 {
          ${theme.font('header', 'thin')};
          margin: 1em 0;
          font-weight: bolder;
          line-height: 1em;
        }

        h1 {
          font-size: 2.1rem;
          margin: 1rem 0;
        }

        h2 {
          font-size: 1.5rem;
        }

        h3 {
          font-size: 1.2rem;
        }
      `} />
    </Fragment>
  )
}

export default GlobalStyles