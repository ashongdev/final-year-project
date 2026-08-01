import api from "@/services/axios";
import type { BillingStatus } from "@/types/Billing";

export const fetchBillingStatus = async (
	baseUrl: string,
): Promise<BillingStatus> => {
	const response = await api.get(`${baseUrl}/billing/status/`);
	return response.data;
};

export const startSubscriptionCheckout = async (
	baseUrl: string,
	interval: "month" | "year",
): Promise<string> => {
	const response = await api.post(`${baseUrl}/billing/checkout/subscription/`, {
		interval,
	});
	return response.data.url;
};

export const startCreditCheckout = async (baseUrl: string): Promise<string> => {
	const response = await api.post(`${baseUrl}/billing/checkout/credits/`);
	return response.data.url;
};

export const openBillingPortal = async (baseUrl: string): Promise<string> => {
	const response = await api.post(`${baseUrl}/billing/portal/`);
	return response.data.url;
};
