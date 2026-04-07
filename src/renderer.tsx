import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './renderer/app/App';

const root = document.getElementById('app');

if (!root) {
  throw new Error('App root element was not found.');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
