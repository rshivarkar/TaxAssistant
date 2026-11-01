import { LogOut, Receipt } from 'lucide-react';
import { useAuth } from '../auth';

export default function Header() {
    const { user, signOut } = useAuth();

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <div className="navbar-brand">
                    <Receipt size={28} />
                    <span>TaxAssistant</span>
                </div>

                {user && (
                    <div className="user-profile">
                        {user.picture && (
                            <img className="avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
                        )}
                        <span className="hide-on-mobile">{user.name}</span>
                        <button className="button button-outline" onClick={signOut}>
                            <LogOut size={16} /> Sign out
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
