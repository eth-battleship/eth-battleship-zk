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
  darkestGrey,
  color4,
} from './colors'

const bgColor = white
const textColor = black
const linkColor = color6

const createTheme = (): any => ({
  layout: {
    bgColor,
    textColor,
  },
  anchor: {
    textColor: linkColor,
    hoverTextColor: white,
    hoverBgColor: linkColor,
    borderColor: linkColor,
    hoverBorderColor: linkColor,
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
  progressBox: {
    bgColor: lighterGrey,
    textColor: black,
  },
  successBox: {
    bgColor: color4,
    textColor: black,
  },
  tooltip: {
    bgColor: black,
    textColor: white,
  },
  header: {
    bgColor: textColor,
    textColor: bgColor,
    anchor: {
      textColor: white,
      hoverTextColor: black,
      hoverBgColor: white,
      borderColor: transparent,
      hoverBorderColor: white,
    },
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
      ship: {
        borderColor: darkestGrey,
      },
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