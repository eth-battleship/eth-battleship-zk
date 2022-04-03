import React from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom"
import { ThemeProvider } from '@emotion/react'
import { ChainId, Config, DAppProvider } from '@usedapp/core'

import Home from './pages/Home'
import CreateGame from './pages/CreateGame'
import ViewGame from './pages/ViewGame'
import GlobalStyles from './components/GlobalStyles'
import { GlobalProvider, GlobalConsumer, CloudProvider } from './contexts'

const Bootstrap: React.FunctionComponent = () => (
  <GlobalConsumer>
    {({ theme }) => (
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <CloudProvider>
          <Router>
            <Routes>
              <Route path="/create" element={<CreateGame />} />
              <Route path="/view/:gameId" element={<ViewGame />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Router>
        </CloudProvider>
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
