import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, FileText, Loader2, UploadCloud, X } from 'lucide-react';
import type { User } from '../auth';
import { CATEGORIES, defaultTaxYear, folderFor, guessCategory, taxYearOptions } from '../lib/documents';
import type { Category } from '../lib/documents';
import { createStore } from '../storage';
import { useDriveToken } from '../storage/useDriveToken';

type Status = 'ready' | 'uploading' | 'done' | 'error';

interface Item {
    id: string;
    file: File;
    category: Category;
    status: Status;
    error?: string;
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function Uploader({ user }: { user: User }) {
    const getDriveToken = useDriveToken(user.email);
    const store = useMemo(
        () => createStore({ idToken: user.idToken, idTokenExpiresAt: user.expiresAt, getDriveToken }),
        [user.idToken, user.expiresAt, getDriveToken],
    );

    const inputRef = useRef<HTMLInputElement>(null);
    const [taxYear, setTaxYear] = useState(defaultTaxYear);
    const [items, setItems] = useState<Item[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const update = (id: string, change: Partial<Item>) =>
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...change } : item)));

    const addFiles = (files: FileList | null) => {
        if (!files?.length) return;
        const added = Array.from(files, (file) => ({
            id: crypto.randomUUID(),
            file,
            category: guessCategory(file.name),
            status: 'ready' as const,
        }));
        setItems((prev) => [...prev, ...added]);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        addFiles(e.dataTransfer.files);
    };

    const pending = items.filter((item) => item.status === 'ready' || item.status === 'error');
    const doneCount = items.filter((item) => item.status === 'done').length;

    const handleUpload = async () => {
        setError('');
        setBusy(true);
        try {
            // First, before any other await, so a consent popup counts as user-initiated.
            await store.connect();
        } catch (e) {
            setError(errorMessage(e));
            setBusy(false);
            return;
        }

        for (const item of pending) {
            update(item.id, { status: 'uploading', error: undefined });
            try {
                await store.upload(item.file, folderFor(taxYear, item.category));
                update(item.id, { status: 'done' });
            } catch (e) {
                console.error('Upload failed:', item.file.name, e);
                update(item.id, { status: 'error', error: errorMessage(e) });
            }
        }
        setBusy(false);
    };

    return (
        <div className="animate-fade-in uploader">
            <div className="toolbar">
                <div>
                    <h2>Hi {user.name.split(' ')[0]}</h2>
                    <p className="muted">Files are saved to {store.label}.</p>
                </div>
                <label className="field">
                    Tax year
                    <select
                        className="select"
                        value={taxYear}
                        onChange={(e) => setTaxYear(Number(e.target.value))}
                        disabled={busy}
                    >
                        {taxYearOptions().map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="card">
                <div
                    className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
                >
                    <UploadCloud className="upload-icon" />
                    <h3>Drop files here</h3>
                    <p className="muted">or click to choose PDFs and photos</p>
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept=".pdf,image/*"
                        hidden
                        onChange={(e) => {
                            addFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />
                </div>

                {items.length > 0 && (
                    <>
                        <ul className="file-list">
                            {items.map((item) => (
                                <li key={item.id} className="file-row">
                                    <StatusIcon status={item.status} />
                                    <div className="file-name">
                                        <span>{item.file.name}</span>
                                        {item.error && <small className="error-text">{item.error}</small>}
                                    </div>
                                    <span className="muted file-size">
                                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                    <select
                                        className="select"
                                        aria-label={`Category for ${item.file.name}`}
                                        value={item.category}
                                        disabled={busy || item.status === 'done'}
                                        onChange={(e) => update(item.id, { category: e.target.value as Category })}
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c}>{c}</option>
                                        ))}
                                    </select>
                                    <button
                                        className="icon-button"
                                        aria-label={`Remove ${item.file.name}`}
                                        disabled={busy}
                                        onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                                    >
                                        <X size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {error && <p className="alert">{error}</p>}

                        <div className="actions">
                            {doneCount > 0 && (
                                <span className="muted">
                                    {doneCount} of {items.length} saved
                                </span>
                            )}
                            <button className="button button-outline" onClick={() => setItems([])} disabled={busy}>
                                Clear
                            </button>
                            <button
                                className="button button-primary"
                                onClick={handleUpload}
                                disabled={busy || pending.length === 0}
                            >
                                {busy ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} /> Saving…
                                    </>
                                ) : (
                                    `Save ${pending.length} file${pending.length === 1 ? '' : 's'}`
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function StatusIcon({ status }: { status: Status }) {
    switch (status) {
        case 'uploading':
            return <Loader2 className="animate-spin" size={20} color="var(--primary)" />;
        case 'done':
            return <CheckCircle size={20} color="var(--secondary)" />;
        case 'error':
            return <AlertCircle size={20} color="var(--danger)" />;
        default:
            return <FileText size={20} color="var(--text-secondary)" />;
    }
}
