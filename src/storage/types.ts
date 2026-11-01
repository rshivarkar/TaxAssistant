/** Somewhere tax documents can be saved. Google Drive and Amazon S3 implement this. */
export interface DocumentStore {
    /** Where files end up, shown to the user. */
    label: string;
    /**
     * Gets credentials. Call it first, straight from a click handler, so a
     * consent popup isn't blocked by the browser.
     */
    connect(): Promise<void>;
    /** Saves one file under `folder` (relative to the store's root). */
    upload(file: File, folder: string[]): Promise<void>;
}
