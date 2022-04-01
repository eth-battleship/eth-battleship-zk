import {
  black,
  white,
  grey,
  darkGrey,
  lightGrey,
  transparent,
  yellow,
  red,
  color6,
  lighterGrey,
} from './colors'

const bgColor = white
const textColor = black
const linkColor = color6

const createTheme = (): any => ({
  layout: {
    bgColor,
    textColor,
  },
  button: {
    disabledBgColor: grey,
    disabledTextColor: darkGrey,
    disabledBorderColor: grey,
    bgColor: linkColor,
    textColor: white,
    borderColor: linkColor,
    hoverBgColor: linkColor,
    hoverTextColor: white,
    hoverBorderColor: linkColor,
    shadowColor: darkGrey,
  },
  errorBox: {
    bgColor: red,
    textColor: white,
    anchor: {
      textColor: white,
      borderBottomColor: white,
      hoverTextColor: white,
      hoverBgColor: linkColor,
    },
  },
  tooltip: {
    bgColor: black,
    textColor: white,
  },
  header: {
    bgColor: textColor,
    textColor: bgColor,
  },
  footer: {
    bgColor: lighterGrey,
    textColor: black,
  },
  modal: {
    overlay: {
      bgColor: 'rgba(0, 0, 0, 0.8)',
    },
    bgColor: white,
    textColor: black,
    shadowColor: 'rgba(0, 0, 0, 0.8)',
  },
  gameBoard: {
    borderColor: black,
    cell: {
      borderColor: darkGrey,
    }
  },
  ship: {
    block: {
      borderColor: black,
    }
  },
  shipSelector: {
    selectedShip: {
      outlineColor: black,
    }
  }
})

export default createTheme