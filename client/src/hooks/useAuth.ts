const useAuth = () => {
	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
	const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
	const handleGoogleLogin = () => {
		const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
		authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
		authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
		authUrl.searchParams.set("response_type", "code");
		authUrl.searchParams.set("scope", "openid email profile");
		authUrl.searchParams.set("access_type", "offline");
		authUrl.searchParams.set("prompt", "consent");

		window.location.href = authUrl.toString();
	};

	return { handleGoogleLogin };
};

export default useAuth;
