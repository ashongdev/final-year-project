import { DEFAULT_SIGNATURE_HEIGHT, DEFAULT_SIGNATURE_WIDTH } from "@/lib/fieldPresets";
import { TextField } from "@/types/TextField";
import { useState } from "react";

/**
 * Shared between the desktop ControlPanel and the mobile field menu so both
 * consumers upload/apply a signature the same way instead of duplicating it.
 */
export function useSignatureFieldActions(
	onUploadSignature: (
		file: File | Blob,
		existingPublicId?: string,
	) => Promise<{ url: string; publicId: string } | null>,
	onFieldUpdate: (id: string, updates: Partial<TextField>) => void,
) {
	const [isUploading, setIsUploading] = useState(false);

	const handleCapture = async (field: TextField, file: File | Blob) => {
		setIsUploading(true);
		try {
			// Overwrites the field's own previous ephemeral asset in place (if
			// any) rather than piling up a new Cloudinary asset every time the
			// signature is redrawn/reuploaded. Never overwrites a library
			// signature — signaturePublicId is only ever set here, from
			// Draw/Upload, and is cleared when a library one is picked.
			const result = await onUploadSignature(file, field.signaturePublicId);
			if (result) {
				onFieldUpdate(field.id, {
					imageUrl: result.url,
					signaturePublicId: result.publicId,
					width: field.width ?? DEFAULT_SIGNATURE_WIDTH,
					height: field.height ?? DEFAULT_SIGNATURE_HEIGHT,
				});
			}
		} finally {
			setIsUploading(false);
		}
	};

	const handleSelectLibrary = (
		field: TextField,
		signature: { url: string; name: string },
	) => {
		onFieldUpdate(field.id, {
			imageUrl: signature.url,
			// Never overwrite a library asset from the ephemeral flow.
			signaturePublicId: undefined,
			width: field.width ?? DEFAULT_SIGNATURE_WIDTH,
			height: field.height ?? DEFAULT_SIGNATURE_HEIGHT,
		});
	};

	return { isUploading, handleCapture, handleSelectLibrary };
}
