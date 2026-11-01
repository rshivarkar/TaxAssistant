import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Cloud, FolderTree, Lock } from 'lucide-react';
import { useAuth } from '../auth';
import { config } from '../config';

const destinations = {
    drive: {
        title: 'Your own Google Drive',
        text: 'Files go straight to a TaxAssistant folder in your Google Drive. We never keep a copy.',
    },
    s3: {
        title: 'Private S3 storage',
        text: 'Files go to a private Amazon S3 folder that only your account can write to.',
    },
    azure: {
        title: 'Private Azure storage',
        text: 'Files go to a private Azure Blob Storage folder that only your account can write to.',
    },
};
const destination = destinations[config.storage];

export default function Home() {
    const { signIn } = useAuth();
    const [error, setError] = useState('');

    return (
        <div className="animate-fade-in">
            <section className="hero">
                <h1>Gather your tax documents in one place</h1>
                <p>
                    Sign in with Google, drop in your W-2s, 1099s and receipts, and they're filed by tax
                    year and type.
                </p>
                <GoogleLogin
                    onSuccess={(response) =>
                        response.credential ? signIn(response.credential) : setError('Google sign-in returned no token.')
                    }
                    onError={() => setError('Google sign-in failed. Please try again.')}
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    text="continue_with"
                />
                {error && <p className="alert">{error}</p>}
            </section>

            <section className="features">
                <div className="card feature">
                    <Cloud size={40} color="var(--primary)" />
                    <h3>{destination.title}</h3>
                    <p>{destination.text}</p>
                </div>
                <div className="card feature">
                    <FolderTree size={40} color="var(--secondary)" />
                    <h3>Organized for you</h3>
                    <p>Each file is filed under its tax year and type (W-2, 1099, 1098, Receipts), guessed from its name.</p>
                </div>
                <div className="card feature">
                    <Lock size={40} color="#f59e0b" />
                    <h3>Direct uploads</h3>
                    <p>Your browser uploads straight to storage with short-lived, single-purpose credentials.</p>
                </div>
            </section>
        </div>
    );
}
