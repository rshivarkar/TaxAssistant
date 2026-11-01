import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { googleLogout } from '@react-oauth/google';
import { decodeIdToken } from './lib/documents';
import type { GoogleProfile } from './lib/documents';

export interface User extends GoogleProfile {
    /** Google ID token. S3 storage exchanges it for AWS credentials. */
    idToken: string;
}

interface AuthContextValue {
    user: User | null;
    signIn: (idToken: string) => void;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Sign-in lives in memory only: reloading the page signs you out.
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    const signIn = (idToken: string) => setUser({ ...decodeIdToken(idToken), idToken });
    const signOut = () => {
        googleLogout();
        setUser(null);
    };

    return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
