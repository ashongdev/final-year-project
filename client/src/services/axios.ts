import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const api = axios.create({
	baseURL: BASE_URL,
	withCredentials: true,
});

// Frontend and backend live on different domains in production (onrender.com
// vs vercel.app), so this JS can never read the csrftoken cookie itself —
// cookies are host-scoped, and cross-domain reads simply aren't possible.
// Instead, GET /csrf/ hands the token back in its response body (a channel
// that does work cross-origin), and every unsafe request echoes it back as
// the X-CSRFToken header. Django only checks that this matches the cookie
// value already attached to the request by the browser, which works fine.
let csrfToken: string | null = null;

export const primeCsrfToken = async (): Promise<void> => {
	const response = await api.get<{ csrfToken: string }>(`${BASE_URL}/csrf/`);
	csrfToken = response.data.csrfToken;
};

api.interceptors.request.use((config) => {
	if (csrfToken) {
		config.headers["X-CSRFToken"] = csrfToken;
	}
	return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				// Attempt to refresh token
				await api.post(`${BASE_URL}/auth/token/refresh/`);
				// Retry original request
				return api(originalRequest);
			} catch (refreshError) {
				// Refresh failed, redirect to login
				window.location.href = "/login";
				return Promise.reject(refreshError);
			}
		}

		return Promise.reject(error);
	},
);

export default api;
