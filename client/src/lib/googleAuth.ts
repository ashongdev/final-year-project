// Computed live from the current origin rather than a fixed env var, so the
// same code works unchanged across localhost, a LAN IP, and any deployed
// domain — Google still requires each actual origin to be pre-registered as
// an authorized redirect URI, this just removes the need to edit .env every
// time the working origin changes.
export const getGoogleRedirectUri = () =>
	`${window.location.origin}/auth/google/callback`;
