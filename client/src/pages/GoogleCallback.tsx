import { useAuthContext } from "@/hooks/useAuthContext";
import api from "@/services/axios";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const GoogleCallback = () => {
	const { BASE_URL } = useAuthContext();
	async function handleGoogleCallback() {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");

		// Guarantees the csrftoken cookie exists before the POST below reads
		// it — this page can load fresh (e.g. Google's redirect back is a
		// full navigation), racing against AuthProvider's own priming call,
		// so this component can't rely on that one having already landed.
		await api.get(`${BASE_URL}/csrf/`);

		const response = await api.post(
			`${BASE_URL}/auth/google/`,
			{ code },
			{
				headers: { "Content-Type": "application/json" },
			},
		);

		if (response.status === 200) {
			window.location.href = "/dashboard";
		}
	}

	useEffect(() => {
		handleGoogleCallback();
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
