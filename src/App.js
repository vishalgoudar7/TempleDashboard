import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AllRouters from './AllRouters';

function App() {
  return (
    <BrowserRouter>
      <AllRouters />
    </BrowserRouter>
  );
}

export default App;
