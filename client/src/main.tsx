import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import './unified.css';
import './modern-overrides.css';
import './login-v3.css';
import './study-premium.css';
import './final-ui.css';
import './mobile-fixes.css';
import './visual-polish-v2.css';
import './ux-fixes-v3.css';
import './stable-options.css';
import './final-mobile-layout.css';
import './zero-scroll-explanation.css';
import './glass-polish.css';
import './glass-visibility-v2.css';
import './spirit-final.css';
import './spirit-motion-v5.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
