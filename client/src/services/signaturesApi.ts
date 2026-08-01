import api from "@/services/axios";
import type { Signature } from "@/types/Signature";

export const fetchSignatures = async (baseUrl: string): Promise<Signature[]> => {
	const response = await api.get(`${baseUrl}/signatures/`);
	return response.data.signatures ?? [];
};

export const saveSignature = async (
	baseUrl: string,
	file: File | Blob,
	name: string,
): Promise<Signature> => {
	const formData = new FormData();
	formData.append("signature", file, "signature.png");
	formData.append("name", name);
	const response = await api.post(`${baseUrl}/signatures/save/`, formData);
	return response.data.signature;
};

export const renameSignature = async (
	baseUrl: string,
	signatureId: number,
	name: string,
): Promise<void> => {
	await api.put(`${baseUrl}/signatures/rename/`, {
		signatureId,
		name,
	});
};

export const deleteSignature = async (
	baseUrl: string,
	signatureId: number,
): Promise<void> => {
	await api.delete(`${baseUrl}/signatures/delete/`, {
		params: { signatureId },
	});
};
