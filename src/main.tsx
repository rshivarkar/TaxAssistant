import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { AuthProvider } from './auth';
import { config } from './config';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <GoogleOAuthProvider clientId={config.googleClientId}>
            <AuthProvider>
                <App />
            </AuthProvider>
        </GoogleOAuthProvider>
    </StrictMode>,
);
