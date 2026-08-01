import api from "@/services/axios";
import { fetchBillingStatus } from "@/services/billingApi";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

interface AuthUser {
	id: number;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
}

interface AuthContextValue {
	user: AuthUser | null;
	userName: string;
	isAuthenticated: boolean;
	isPro: boolean;
	loading: boolean;
	refreshAuth: () => Promise<void>;
	logout: () => Promise<void>;
	BASE_URL: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [isPro, setIsPro] = useState(false);
	const [loading, setLoading] = useState(true);

	const BASE_URL = import.meta.env.VITE_BASE_URL as string;

	const refreshAuth = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get<AuthUser>(`${BASE_URL}/me/`);
			setUser(response.data ?? null);
			if (response.data) {
				try {
					const billing = await fetchBillingStatus(BASE_URL);
					setIsPro(billing.is_pro);
				} catch {
					setIsPro(false);
				}
			} else {
				setIsPro(false);
			}
		} catch {
			setUser(null);
			setIsPro(false);
		} finally {
			setLoading(false);
		}
	}, [BASE_URL]);

	useEffect(() => {
		// The frontend only ever talks to Django's JSON API, so nothing
		// else naturally makes Django set the csrftoken cookie — without
		// this, a user's very first POST (e.g. Google login) has no token
		// to send and gets rejected. Fire this once, as early as possible.
		void api.get(`${BASE_URL}/csrf/`);
	}, [BASE_URL]);

	useEffect(() => {
		void refreshAuth();
	}, [refreshAuth]);

	const logout = useCallback(async () => {
		try {
			// Clears the Django session server-side and expires the
			// sessionid cookie — without this, the cookie stays valid and
			// the next /me/ call just logs the user back in.
			await api.post(`${BASE_URL}/auth/logout/`);
		} catch {
			// Best-effort: still clear local state even if the request
			// fails, so the UI doesn't get stuck looking logged in.
		}
		setUser(null);
		setIsPro(false);
	}, [BASE_URL]);

	const isAuthenticated = user !== null;
	const userName =
		user?.first_name || user?.username || user?.email || "";

	const value = useMemo(
		() => ({
			user,
			userName,
			isAuthenticated,
			isPro,
			loading,
			refreshAuth,
			logout,
			BASE_URL,
		}),
		[
			user,
			userName,
			isAuthenticated,
			isPro,
			loading,
			refreshAuth,
			logout,
			BASE_URL,
		],
	);

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
};

export default AuthContext;
