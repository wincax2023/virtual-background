import React from 'react';
import Background from './components/setting/Background';
import LocalCamera from './components/video/LocalCamera';

import './App.css';

function App() {
  return (
    <div className="App">
        <Background />
        <LocalCamera />
    </div>
  );
}

export default App;
