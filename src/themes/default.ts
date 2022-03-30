import {
  black,
  white,
} from './colors'

const bgColor = white
const textColor = black

const createTheme = (): any => ({
  layout: {
    bgColor,
    textColor,
  },
})

export default createTheme