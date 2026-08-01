import axios from "axios";

interface UpgradeErrorBody {
	error?: string;
	upgrade_required?: boolean;
}

const isUpgradeErrorBody = (data: unknown): data is UpgradeErrorBody =>
	!!data &&
	typeof data === "object" &&
	(data as UpgradeErrorBody).upgrade_required === true &&
	typeof (data as UpgradeErrorBody).error === "string";

/**
 * If an error is a 402 "upgrade required" response from the backend's
 * paid-tier gates (batch cap, template cap, recipient verification,
 * analytics, multi-field), returns its message. Otherwise null, so callers
 * can fall back to a generic error toast. For plain JSON error responses.
 */
export const extractUpgradeError = (err: unknown): string | null => {
	if (!axios.isAxiosError(err)) return null;
	if (err.response?.status !== 402) return null;
	const data = err.response.data;
	return isUpgradeErrorBody(data) ? data.error! : null;
};

/**
 * Same as extractUpgradeError, but for requests made with
 * responseType: "blob" — axios still delivers error bodies as a Blob in
 * that mode, so the JSON has to be read out of it first.
 */
export const extractUpgradeErrorFromBlob = async (
	err: unknown,
): Promise<string | null> => {
	if (!axios.isAxiosError(err)) return null;
	if (err.response?.status !== 402) return null;
	const body = err.response.data;
	if (!(body instanceof Blob)) {
		return isUpgradeErrorBody(body) ? body.error! : null;
	}
	try {
		const parsed: unknown = JSON.parse(await body.text());
		return isUpgradeErrorBody(parsed) ? parsed.error! : null;
	} catch {
		return null;
	}
};
