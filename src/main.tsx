import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

import { AuthProvider } from './context/AuthContext.tsx';

// TODO: Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = "875045284124-gsibf02t4dbmf60070n7h62j0d5t0tuk.apps.googleusercontent.com";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </GoogleOAuthProvider>
    </AuthProvider>
  </StrictMode>,
);
