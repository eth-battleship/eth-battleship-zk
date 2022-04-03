import React from 'react'
import { css } from '@emotion/react'
import ClipLoader from 'react-spinners/ClipLoader'

const override = css`
  display: inline-block;
  margin: 0 0.5em 0;
  padding: 0;
  border-color: grey;
`;

const LoadingIcon: React.FunctionComponent = () => (
  <ClipLoader loading={true} css={override} size={15} />
)

export default LoadingIcon