import type { Recipient, TextField } from "@/types/TextField";

/**
 * Preserves a guest's in-progress editor session across the full-page
 * redirect to Google OAuth and back, so choosing "Sign In" from the
 * unsaved-progress warning (see UnsavedProgressDialog) actually resumes
 * them where they were instead of discarding everything.
 *
 * sessionStorage holds the JSON-serializable parts. A local, not-yet-
 * uploaded template File goes to IndexedDB instead — sessionStorage can't
 * reliably hold multi-MB binary data, and certificate templates often are
 * that big. Nothing here handles *where* to navigate back to afterward —
 * that's the generic post-login redirect path Login.tsx/GoogleCallback.tsx
 * handle for every protected route, not just the editor.
 */

interface PendingSessionMeta {
	fields: TextField[];
	recipients: Recipient[];
	templateUseMode?: "testing" | "actual";
	mode: "simple" | "advanced";
	/** Only set when the template is already a remote URL, not a local file. */
	templateUrl: string | null;
	hasTemplateFile: boolean;
}

export interface RestoredSession {
	fields: TextField[];
	recipients: Recipient[];
	templateUseMode?: "testing" | "actual";
	mode: "simple" | "advanced";
	templateUrl: string | null;
	templateFile: File | null;
}

const SESSION_STORAGE_KEY = "genc_pending_session";
const DB_NAME = "genc-pending-session";
const STORE_NAME = "files";
const FILE_KEY = "templateFile";

const openDb = (): Promise<IDBDatabase> =>
	new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			req.result.createObjectStore(STORE_NAME);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});

const idbSet = async (key: string, value: File): Promise<void> => {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).put(value, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	db.close();
};

const idbGet = async (key: string): Promise<File | undefined> => {
	const db = await openDb();
	const result = await new Promise<File | undefined>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const req = tx.objectStore(STORE_NAME).get(key);
		req.onsuccess = () => resolve(req.result as File | undefined);
		req.onerror = () => reject(req.error);
	});
	db.close();
	return result;
};

const idbDelete = async (key: string): Promise<void> => {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).delete(key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	db.close();
};

export interface PendingSessionInput {
	fields: TextField[];
	recipients: Recipient[];
	templateUseMode?: "testing" | "actual";
	mode: "simple" | "advanced";
	templateUrl: string | null;
	templateFile: File | null;
}

export const savePendingSession = async (
	input: PendingSessionInput,
): Promise<void> => {
	const meta: PendingSessionMeta = {
		fields: input.fields,
		recipients: input.recipients,
		templateUseMode: input.templateUseMode,
		mode: input.mode,
		templateUrl: input.templateUrl,
		hasTemplateFile: !!input.templateFile,
	};
	sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(meta));

	if (input.templateFile) {
		try {
			await idbSet(FILE_KEY, input.templateFile);
		} catch {
			// Best-effort — the JSON-serializable part above still restores
			// even if IndexedDB is unavailable (e.g. private browsing).
		}
	}
};

export const restorePendingSession = async (): Promise<RestoredSession | null> => {
	const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
	if (!raw) return null;
	sessionStorage.removeItem(SESSION_STORAGE_KEY);

	let meta: PendingSessionMeta;
	try {
		meta = JSON.parse(raw);
	} catch {
		return null;
	}

	let templateFile: File | null = null;
	if (meta.hasTemplateFile) {
		try {
			templateFile = (await idbGet(FILE_KEY)) ?? null;
			await idbDelete(FILE_KEY);
		} catch {
			templateFile = null;
		}
	}

	return {
		fields: meta.fields,
		recipients: meta.recipients,
		templateUseMode: meta.templateUseMode,
		mode: meta.mode,
		templateUrl: meta.templateUrl,
		templateFile,
	};
};
