import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { reconcilePush } from './services/push';
window.addEventListener('firewalldo:authenticated',event=>{const id=(event as CustomEvent<{id:string}>).detail?.id;if(id)void reconcilePush(id).catch(()=>{});});
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

import './styles/responsive.css';

import './styles/responsive.css';
