import { useGoogleLogin } from '@react-oauth/google';
import type { TokenResponse } from '@react-oauth/google';
import { ArrowRight, ShieldCheck, FileText, Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
    const navigate = useNavigate();
    const { setUser, setAccessToken } = useAuth();
    const fetchUserInfo = async (token: string) => {
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setUser({
                name: data.name,
                email: data.email,
                picture: data.picture
            });
        } catch (error) {
            console.error('Failed to fetch user info', error);
        }
    };

    const login = useGoogleLogin({
        onSuccess: (codeResponse: Omit<TokenResponse, "error" | "error_description" | "error_uri">) => {
            console.log("Login Success!");
            setAccessToken(codeResponse.access_token);
            fetchUserInfo(codeResponse.access_token);
            navigate('/dashboard');
        },
        onError: (error) => console.log('Login Failed:', error),
        scope: "email profile https://www.googleapis.com/auth/drive.file"
    });

    return (
        <div className="animate-fade-in">
            <section className="hero">
                <h1>Simplify Your Tax Filing</h1>
                <p>
                    Securely upload your tax documents, organize them in one place, and sync effortlessly with Google Drive. Start your seamless tax filing journey today.
                </p>
                <button className="button button-primary" style={{ fontSize: '1.25rem', padding: '1rem 2rem', marginTop: '1rem' }} onClick={() => login()}>
                    Get Started with Google <ArrowRight size={20} />
                </button>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '4rem' }}>
                <div className="card text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <ShieldCheck size={48} color="var(--secondary)" />
                    <h3>Bank-Grade Security</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Your tax documents are encrypted and secured with industry-leading standards.</p>
                </div>
                <div className="card text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Cloud size={48} color="var(--primary)" />
                    <h3>Google Drive Sync</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Automatically sync your uploads directly to a dedicated folder in your Google Drive.</p>
                </div>
                <div className="card text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <FileText size={48} color="#f59e0b" />
                    <h3>Smart Organization</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>We automatically organize your W-2s, 1099s, and receipts for easy access and filing.</p>
                </div>
            </section>
        </div>
    );
}
