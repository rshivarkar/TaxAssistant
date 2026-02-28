import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Use standard type 'google' from @types/google.accounts
interface AuthContextType {
    accessToken: string | null;
    setAccessToken: (token: string | null) => void;
    user: { name: string; email: string; picture?: string } | null;
    setUser: (user: { name: string; email: string; picture?: string } | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<{ name: string; email: string; picture?: string } | null>(null);

    return (
        <AuthContext.Provider value={{ accessToken, setAccessToken, user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
