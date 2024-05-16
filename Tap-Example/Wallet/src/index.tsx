import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as opentap from 'open-tap-nodejs';
import App from './App';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);

root.render(<App />);
