import { useAuth } from './auth';
import Header from './components/Header';
import Home from './components/Home';
import Uploader from './components/Uploader';

// Two screens, no router: signed out shows Home, signed in shows the uploader.
// That also avoids GitHub Pages 404s on deep links.
export default function App() {
    const { user } = useAuth();

    return (
        <div className="app-container">
            <Header />
            <main className="main-content">{user ? <Uploader key={user.idToken} user={user} /> : <Home />}</main>
        </div>
    );
}
