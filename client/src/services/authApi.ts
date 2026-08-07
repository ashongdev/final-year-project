import api from "@/services/axios";

export const registerAccount = async (
	baseUrl: string,
	name: string,
	email: string,
	password: string,
): Promise<void> => {
	await api.post(`${baseUrl}/auth/register/`, { name, email, password });
};

export const verifyEmailCode = async (
	baseUrl: string,
	email: string,
	code: string,
): Promise<void> => {
	await api.post(`${baseUrl}/auth/verify-email/`, { email, code });
};

export const resendVerificationCode = async (
	baseUrl: string,
	email: string,
): Promise<void> => {
	await api.post(`${baseUrl}/auth/resend-verification/`, { email });
};

export const loginWithPassword = async (
	baseUrl: string,
	email: string,
	password: string,
): Promise<void> => {
	await api.post(`${baseUrl}/auth/login/`, { email, password });
};

export const requestPasswordReset = async (
	baseUrl: string,
	email: string,
): Promise<void> => {
	await api.post(`${baseUrl}/auth/password-reset/request/`, { email });
};

export const confirmPasswordReset = async (
	baseUrl: string,
	email: string,
	code: string,
	newPassword: string,
): Promise<void> => {
	await api.post(`${baseUrl}/auth/password-reset/confirm/`, {
		email,
		code,
		new_password: newPassword,
	});
};
