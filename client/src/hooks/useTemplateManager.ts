import { logEvent } from "@/lib/analytics";
import {
	extractUpgradeError,
	extractUpgradeErrorFromBlob,
} from "@/lib/billingErrors";
import { getVisibleFields } from "@/lib/fieldPresets";
import {
	hasTemplateSource,
	resolveTemplateFile,
} from "@/lib/templateFileUtils";
import api from "@/services/axios";
import { logActivity } from "@/services/dashboardApi";
import type { Recipient, TextField } from "@/types/TextField";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "./useAuthContext";

interface UseTemplateManagerProps {
	templateFile: File | null;
	templateUrl: string | null;
	fields: TextField[];
	recipients: Recipient[];
	customPublicId: string;
	isPublishing: boolean;
	setTemplateFile: React.Dispatch<React.SetStateAction<File | null>>;
	setTemplateUrl: React.Dispatch<React.SetStateAction<string | null>>;
	setCustomPublicId: React.Dispatch<React.SetStateAction<string>>;
	setIsPublishing: React.Dispatch<React.SetStateAction<boolean>>;
	setShowSharePanel: React.Dispatch<React.SetStateAction<boolean>>;
	setGeneratedLink: React.Dispatch<React.SetStateAction<string>>;
}

interface CheckIdResponse {
	exists: boolean;
}

interface UploadResponse {
	public_id?: string;
	secure_url?: string;
}

const useTemplateManager = ({
	templateFile,
	templateUrl,
	fields,
	recipients,
	customPublicId,
	isPublishing,
	setTemplateFile,
	setTemplateUrl,
	setCustomPublicId,
	setIsPublishing,
	setShowSharePanel,
	setGeneratedLink,
}: UseTemplateManagerProps) => {
	const { isAuthenticated, BASE_URL } = useAuthContext();

	// Tracks the Cloudinary public_id already owned by this editing session
	// (from an earlier silent upload, publish, or "Load by ID"), so later
	// uploads/publishes overwrite that same asset instead of creating a
	// duplicate. Reset whenever a fresh template is picked from scratch.
	const [uploadedPublicId, setUploadedPublicId] = useState<string | null>(
		null,
	);

	// Revoke local blob URLs to avoid memory leaks
	useEffect(() => {
		return () => {
			if (templateUrl?.startsWith("blob:")) {
				URL.revokeObjectURL(templateUrl);
			}
		};
	}, [templateUrl]);

	// When we have a remote URL but no file, prefetch it so generate works offline
	useEffect(() => {
		if (templateFile || !templateUrl) return;
		let cancelled = false;
		void resolveTemplateFile(null, templateUrl).then((file) => {
			if (!cancelled && file) setTemplateFile(file);
		});
		return () => {
			cancelled = true;
		};
	}, [templateFile, templateUrl, setTemplateFile]);

	/**
	 * Renders the certificate exactly as the server would (same /generate/
	 * pipeline used for real downloads), returning the resulting image blob.
	 * Shared by both "Generate" (download) and "Preview" (view only).
	 */
	const generateCertificateBlob = async (
		purpose: "download" | "preview" = "download",
	): Promise<Blob | null> => {
		if (!hasTemplateSource(templateFile, templateUrl)) {
			toast.error("Please upload a template first");
			return null;
		}

		const resolvedFile = await resolveTemplateFile(templateFile, templateUrl);
		if (!resolvedFile) {
			toast.error("Failed to load the selected template");
			return null;
		}

		const formData = new FormData();
		formData.append("template", resolvedFile);
		formData.append("fields", JSON.stringify(getVisibleFields(fields)));
		formData.append("inEditor", "true");
		formData.append("purpose", purpose);
		// Lets the backend attribute this generation to the right template
		// for analytics, even though the image itself is re-uploaded rather
		// than fetched by id.
		if (uploadedPublicId) {
			formData.append("certificateId", uploadedPublicId);
		}

		try {
			const response = await axios.post(
				`${BASE_URL}/generate/`,
				formData,
				{ responseType: "blob" },
			);
			return response.data as Blob;
		} catch (err) {
			const upgradeMessage = await extractUpgradeErrorFromBlob(err);
			if (upgradeMessage) {
				toast.error(upgradeMessage, {
					action: {
						label: "View Plans",
						onClick: () => window.location.assign("/pricing"),
					},
				});
			} else {
				toast.error("Failed to generate certificate");
			}
			return null;
		}
	};

	const handleDownload = async () => {
		const blob = await generateCertificateBlob("download");
		if (!blob) return;

		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "Certificate.png";
		link.click();
		URL.revokeObjectURL(url);

		logEvent("Certificate", "Generate", "Editor Generation");
		toast.success("Download complete");
	};

	/**
	 * Same real rendering as handleDownload, but returns an object URL to
	 * display instead of triggering a file download. Caller owns the
	 * returned URL and must revoke it when done (e.g. on dialog close).
	 */
	const handlePreview = async (): Promise<string | null> => {
		const blob = await generateCertificateBlob("preview");
		if (!blob) return null;
		return URL.createObjectURL(blob);
	};

	const handleBatchDownload = async () => {
		if (!hasTemplateSource(templateFile, templateUrl)) {
			toast.error("Please upload a template first");
			return;
		}
		if (recipients.length === 0) {
			toast.error("Please add at least one recipient");
			return;
		}

		const resolvedFile = await resolveTemplateFile(templateFile, templateUrl);
		if (!resolvedFile) {
			toast.error("Failed to load the selected template");
			return;
		}

		const toastId = toast.loading(`Generating ${recipients.length} certificate(s)...`);
		const formData = new FormData();
		formData.append("template", resolvedFile);
		formData.append("fields", JSON.stringify(getVisibleFields(fields)));
		formData.append("recipients", JSON.stringify(recipients));
		formData.append("inEditor", "true");
		// Lets the backend attribute this batch to the right template for
		// analytics, even though the image itself is re-uploaded rather than
		// fetched by id.
		if (uploadedPublicId) {
			formData.append("certificateId", uploadedPublicId);
		}

		try {
			const response = await api.post(`${BASE_URL}/generate-batch/`, formData, {
				responseType: "blob",
			});

			const url = URL.createObjectURL(response.data as Blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "certificates.zip";
			link.click();
			URL.revokeObjectURL(url);

			logEvent("Certificate", "BatchGenerate", `${recipients.length} recipients`);
			toast.dismiss(toastId);
			toast.success(`${recipients.length} certificate(s) downloaded as ZIP`);

			const batchErrors = response.headers["x-batch-errors"];
			if (batchErrors) {
				toast.warning(`Some certificates had errors: ${batchErrors}`);
			}
		} catch (err) {
			toast.dismiss(toastId);
			const upgradeMessage = await extractUpgradeErrorFromBlob(err);
			if (upgradeMessage) {
				toast.error(upgradeMessage, {
					action: {
						label: "View Plans",
						onClick: () => window.location.assign("/pricing"),
					},
				});
			} else {
				toast.error("Batch generation failed");
			}
		}
	};

	const handleTemplateUpload = async (file: File) => {
		if (!file) {
			toast.warning("Please select a file");
			return;
		}

		setTemplateFile(file);
		const url = URL.createObjectURL(file);
		setTemplateUrl(url);
		toast.success("Template loaded");

		if (isAuthenticated) {
			const formData = new FormData();
			formData.append("template", file);
			if (uploadedPublicId) {
				formData.append("existing_public_id", uploadedPublicId);
			}
			try {
				// Returns JSON { public_id, secure_url } — NOT a blob.
				// Passing existing_public_id (when we have one) makes the
				// backend overwrite that same asset instead of creating a
				// new one, so swapping templates mid-session doesn't leave
				// orphaned duplicates in storage.
				const res = await api.post<UploadResponse>(
					`${BASE_URL}/upload/`,
					formData,
				);
				if (res.data.public_id) setUploadedPublicId(res.data.public_id);
			} catch {
				// Non-fatal: the local template is still usable
			}
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) void handleTemplateUpload(file);
	};

	const handleShareClick = () => {
		if (!hasTemplateSource(templateFile, templateUrl)) {
			toast.error("Please upload a template first");
			return;
		}
		setShowSharePanel(true);
	};

	const checkId = async (publicId: string): Promise<boolean> => {
		const res = await api.post<CheckIdResponse>(
			`${BASE_URL}/check-public-id/`,
			{ public_id: publicId },
		);
		return res.data.exists;
	};

	const handlePublish = async () => {
		if (!hasTemplateSource(templateFile, templateUrl) || isPublishing) {
			if (!hasTemplateSource(templateFile, templateUrl)) {
				toast.error("Please upload a template first");
			}
			return;
		}

		setIsPublishing(true);
		const toastId = toast.loading("Uploading template...");

		try {
			const resolvedFile = await resolveTemplateFile(templateFile, templateUrl);
			if (!resolvedFile) {
				toast.dismiss(toastId);
				toast.error("Failed to load template");
				return;
			}

			let finalPublicId = customPublicId.trim();

			if (finalPublicId && finalPublicId !== uploadedPublicId) {
				const exists = await checkId(finalPublicId);
				if (exists) {
					finalPublicId = `${finalPublicId}_${Date.now()}`;
					setCustomPublicId(finalPublicId);
					toast.info(`ID already taken. Using "${finalPublicId}" instead.`);
				}
			}

			const formData = new FormData();
			formData.append("template", resolvedFile);
			if (finalPublicId) formData.append("public_id", finalPublicId);
			if (uploadedPublicId) {
				formData.append("existing_public_id", uploadedPublicId);
			}

			// Reuses/overwrites the asset already owned by this session (see
			// existing_public_id above) instead of creating a duplicate.
			const res = await api.post<UploadResponse>(`${BASE_URL}/upload/`, formData);

			if (res.data.public_id) {
				setUploadedPublicId(res.data.public_id);

				// Persist the recipient allow-list for this template. An empty
				// list clears any prior restriction, so the link stays open —
				// gating is purely opt-in based on whether recipients exist.
				try {
					await api.post(`${BASE_URL}/templates/recipients/`, {
						public_id: res.data.public_id,
						recipients: JSON.stringify(recipients),
					});
				} catch (err) {
					// Non-fatal: the template is still published either way.
					const upgradeMessage = extractUpgradeError(err);
					toast.warning(
						upgradeMessage ??
							"Published, but the recipient list couldn't be saved.",
						upgradeMessage
							? {
									action: {
										label: "View Plans",
										onClick: () => window.location.assign("/pricing"),
									},
								}
							: undefined,
					);
				}

				const encodedFields = btoa(JSON.stringify(getVisibleFields(fields)));
				const params = new URLSearchParams({
					id: res.data.public_id,
					data: encodedFields,
				});
				const link = `${window.location.origin}/participant?${params.toString()}`;

				setGeneratedLink(link);

				logActivity(BASE_URL, "link_shared", res.data.public_id);
				logEvent("Certificate", "Publish", "New Template Published");
				toast.dismiss(toastId);
				toast.success("Published successfully!");
			}
		} catch (err) {
			toast.dismiss(toastId);
			const upgradeMessage = extractUpgradeError(err);
			if (upgradeMessage) {
				toast.error(upgradeMessage, {
					action: {
						label: "View Plans",
						onClick: () => window.location.assign("/pricing"),
					},
				});
			} else {
				toast.error("Failed to publish template");
			}
		} finally {
			setIsPublishing(false);
		}
	};

	/**
	 * Uploads a signature (drawn or picked file) to Cloudinary and returns
	 * its URL, or null on failure. Always organizer-initiated, from the
	 * editor's inspector panel — never from the public participant link.
	 */
	const handleSignatureUpload = async (
		file: File | Blob,
		existingPublicId?: string,
	): Promise<{ url: string; publicId: string } | null> => {
		const formData = new FormData();
		formData.append("signature", file, "signature.png");
		if (existingPublicId) {
			formData.append("existing_public_id", existingPublicId);
		}
		try {
			const res = await api.post<{ secure_url?: string; public_id?: string }>(
				`${BASE_URL}/upload-signature/`,
				formData,
			);
			if (!res.data.secure_url || !res.data.public_id) return null;
			return { url: res.data.secure_url, publicId: res.data.public_id };
		} catch {
			toast.error("Failed to upload signature");
			return null;
		}
	};

	return {
		handleDownload,
		handleBatchDownload,
		handlePreview,
		handleTemplateUpload,
		handleFileSelect,
		handleShareClick,
		handlePublish,
		handleSignatureUpload,
		uploadedPublicId,
		setUploadedPublicId,
	};
};

export default useTemplateManager;
