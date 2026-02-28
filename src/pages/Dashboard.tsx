import { useState } from 'react';
import { UploadCloud, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';


export default function Dashboard() {
    const { user } = useAuth();
    const [dragActive, setDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);


    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFiles = Array.from(e.dataTransfer.files);
            setFiles((prev) => [...prev, ...droppedFiles]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            const selectedFiles = Array.from(e.target.files);
            setFiles((prev) => [...prev, ...selectedFiles]);
        }
    };

    const handleUpload = async () => {
        if (!files.length) return;

        setIsUploading(true);
        let successCount = 0;

        try {
            // Determine Folder Path dynamically based on User and current year
            const currentYear = new Date().getFullYear();
            const userNameSafe = user?.name ? user.name : 'Unknown User';
            const folderPath = `TaxAssistant - ${userNameSafe} - ${currentYear}`;

            // Upload each file to the designated Firebase Storage folder
            for (const file of files) {
                try {
                    // Create a reference to the specific file inside the folder path
                    const fileRef = ref(storage, `${folderPath}/${file.name}`);

                    // Upload the file
                    await uploadBytes(fileRef, file);
                    successCount++;
                } catch (error) {
                    console.error("Error uploading:", file.name, error);
                }
            }
        } catch (error) {
            console.error("Error during upload setup:", error);
            alert("An error occurred trying to connect to Google Cloud Storage.");
        }

        setIsUploading(false);
        if (successCount === files.length) {
            alert(`Successfully uploaded ${successCount} files securely!`);
            setFiles([]);
        } else {
            alert(`Uploaded ${successCount}/${files.length} files. Check console for errors.`);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2>Welcome Back</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Upload your latest W-2s, 1099s, and receipts for processing and secure storage.</p>
            </div>

            <div className="card">
                <div
                    className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <UploadCloud className="upload-icon" />
                    <h3>Drag & Drop Files Here</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>or click to browse your computer</p>
                    <input
                        type="file"
                        id="file-upload"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleChange}
                    />
                    <button className="button button-outline" onClick={(e) => { e.stopPropagation(); document.getElementById('file-upload')?.click(); }}>
                        Browse Files
                    </button>
                </div>

                {files.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Selected Files ({files.length})</h4>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {files.map((file, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                    <CheckCircle size={20} color="var(--secondary)" />
                                    <span style={{ flex: 1 }}>{file.name}</span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                </li>
                            ))}
                        </ul>

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="button button-outline" onClick={() => setFiles([])}>Clear</button>
                            <button className="button button-primary" onClick={handleUpload} disabled={isUploading}>
                                {isUploading ? <><Loader2 className="animate-spin" size={16} /> Uploading...</> : 'Sync to Google Drive'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
