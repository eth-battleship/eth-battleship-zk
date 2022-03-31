import React from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom"

import HomePage from './pages/HomePage'
import NewGame from './pages/NewGame'
import ViewGame from './pages/ViewGame'
import GlobalStyles from './components/GlobalStyles'
import { GlobalProvider, GlobalConsumer } from './contexts'
import { ThemeProvider } from '@emotion/react'
import { ChainId, Config, DAppProvider } from '@usedapp/core'

const Bootstrap: React.FunctionComponent = () => (
  <GlobalConsumer>
    {({ theme }) => (
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<NewGame />} />
            <Route path="/:address" element={<ViewGame />} />
          </Routes>
        </Router>
      </ThemeProvider>
    )}
  </GlobalConsumer>
)

const DappProviderConfig: Config = {
  multicallAddresses: {
    [ChainId.Localhost]: require('./contracts/addresses.json')[ChainId.Localhost].Multicall,
  }
}

const App: React.FunctionComponent = () => (
  <DAppProvider config={DappProviderConfig}>
    <GlobalProvider>
      <Bootstrap />
    </GlobalProvider>
  </DAppProvider>
)

export default App
