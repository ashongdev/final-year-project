import type { Location } from "react-router-dom";

/**
 * Where to send the user back to after signing in — generic for any
 * protected route, not just the editor. ProtectedRoute's own "Sign In"
 * link already sets `state: { from: location }`; this is what actually
 * consumes that (previously it was set but never read anywhere). Needs
 * sessionStorage rather than just reading location.state in
 * GoogleCallback, since a login redirects through a full-page trip to
 * Google and back, which drops React Router's in-memory state.
 */

const STORAGE_KEY = "genc_post_login_redirect";

export const stashPostLoginRedirect = (from: Location): void => {
	sessionStorage.setItem(STORAGE_KEY, from.pathname + from.search);
};

export const consumePostLoginRedirect = (): string | null => {
	const path = sessionStorage.getItem(STORAGE_KEY);
	sessionStorage.removeItem(STORAGE_KEY);
	return path;
};
