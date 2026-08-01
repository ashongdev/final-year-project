import axios from "axios";

function getCookie(name) {
	let cookieValue = null;
	if (document.cookie && document.cookie !== "") {
		const cookies = document.cookie.split(";");
		for (let cookie of cookies) {
			cookie = cookie.trim();
			if (cookie.startsWith(name + "=")) {
				cookieValue = decodeURIComponent(
					cookie.substring(name.length + 1),
				);
				break;
			}
		}
	}
	return cookieValue;
}

const BASE_URL = import.meta.env.VITE_BASE_URL;
const csrftoken = getCookie("csrftoken");

const api = axios.create({
	baseURL: BASE_URL,
	withCredentials: true,
	headers: {
		// "Content-Type": "application/json",
		"X-CSRFToken": csrftoken,
	},
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
