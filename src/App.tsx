import React from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom"

import HomePage from './pages/HomePage'
import NewGame from './pages/NewGame'
import ViewGame from './pages/ViewGame'

const App: React.FunctionComponent = () => (
  <Router>
    <Routes>
      <Route path="/" element={<HomePage />}/>
      <Route path="/new" element={<NewGame />}/>
      <Route path="/:address" element={<ViewGame />}/>
    </Routes>
  </Router>
)

export default App
