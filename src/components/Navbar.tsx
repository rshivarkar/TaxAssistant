import { useNavigate } from 'react-router-dom';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import type { TokenResponse } from '@react-oauth/google';
import { Receipt, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
export default function Navbar() {
    const navigate = useNavigate();
    const { user, setUser, setAccessToken } = useAuth();

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

    const handleLogout = () => {
        googleLogout();
        setUser(null);
        setAccessToken(null);
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <div className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <Receipt size={28} />
                    <span>TaxAssistant</span>
                </div>

                <div className="navbar-actions">
                    {user ? (
                        <div className="user-profile">
                            <span>{user.name}</span>
                            <button className="button button-outline" onClick={handleLogout}>
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    ) : (
                        <button className="button button-primary" onClick={() => login()}>
                            Login with Google
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
