import { Themes } from 'emotion-styled-utils'

import createDefaultTheme from './default'

export const setupThemes = (breakpoints: object = {}) => {
  const themes = new Themes({}, breakpoints)

  themes.add('default', createDefaultTheme())

  return themes
}