import { useAuthContext } from "@/hooks/useAuthContext";
import { getGoogleRedirectUri } from "@/lib/googleAuth";
import { restorePendingSession } from "@/lib/pendingSession";
import { consumePostLoginRedirect } from "@/lib/postLoginRedirect";
import api, { primeCsrfToken } from "@/services/axios";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const GoogleCallback = () => {
	const { BASE_URL, refreshAuth } = useAuthContext();
	const navigate = useNavigate();

	async function handleGoogleCallback() {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");

		// Guarantees a fresh CSRF token is in hand before the POST below —
		// this page can load fresh (e.g. Google's redirect back is a full
		// navigation), racing against AuthProvider's own priming call, so
		// this component can't rely on that one having already landed.
		await primeCsrfToken();

		const response = await api.post(
			`${BASE_URL}/auth/google/`,
			{ code, redirect_uri: getGoogleRedirectUri() },
			{
				headers: { "Content-Type": "application/json" },
			},
		);

		if (response.status !== 200) return;

		// Now actually signed in — refresh the app's auth state ourselves,
		// since navigating client-side (below, so any restored editor state
		// survives) won't trigger AuthProvider's own mount-time check again.
		await refreshAuth();

		const redirectPath = consumePostLoginRedirect() ?? "/dashboard";
		const session = await restorePendingSession();

		if (session) {
			// Matches the location.state shape Editor.tsx (and Advanced.tsx)
			// already read — this is how a guest's in-progress template and
			// fields survive the round trip to Google and back after
			// choosing "Sign In" from UnsavedProgressDialog.
			navigate(redirectPath, {
				state: {
					fields: session.fields,
					recipients: session.recipients,
					templateUseMode: session.templateUseMode,
					templateUrl: session.templateUrl,
					templateFile: session.templateFile,
				},
			});
		} else {
			navigate(redirectPath);
		}
	}

	useEffect(() => {
		handleGoogleCallback();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-6">
			<div className="w-full max-w-sm border-2 border-foreground bg-card p-8 text-center shadow-[5px_5px_0_hsl(var(--foreground)/0.15)]">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-secondary">
					<Loader2 className="h-5 w-5 animate-spin text-secondary-foreground" />
				</div>
				<h1 className="mt-4 font-playfair text-2xl italic text-foreground">
					Finishing Sign In
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					We are verifying your Google account and redirecting you.
				</p>
				<p className="mt-4 text-xs text-muted-foreground">
					If this takes too long, go back to login and try again.
				</p>
				<Link
					to="/login"
					className="mt-4 inline-block w-full border-2 border-foreground bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
				>
					Back to Login
				</Link>
			</div>
		</div>
	);
};

export default GoogleCallback;
