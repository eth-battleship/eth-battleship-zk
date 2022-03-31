import React from 'react'
import { css } from '@emotion/react'
import ClipLoader from 'react-spinners/ClipLoader'

const override = css`
  display: block;
  margin: 0 auto;
  border-color: red;
`;

const LoadingIcon: React.FunctionComponent = () => (
  <ClipLoader loading={true} css={override} size={150} />
)

export default LoadingIcon