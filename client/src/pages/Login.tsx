import AuthButton from "@/components/AuthButton";
import GencMark from "@/components/GencMark";
import { Button } from "@/components/ui/button";
import GitHubSvg from "@/components/ui/GitHubSvg";
import GoogleSvg from "@/components/ui/GoogleSvg";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useAuth from "@/hooks/useAuth";
import { useAuthContext } from "@/hooks/useAuthContext";
import { restorePendingSession } from "@/lib/pendingSession";
import {
	consumePostLoginRedirect,
	stashPostLoginRedirect,
} from "@/lib/postLoginRedirect";
import { loginWithPassword } from "@/services/authApi";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Link,
	useLocation,
	useNavigate,
	type Location,
} from "react-router-dom";

const fieldClass =
	"rounded-none border-x-0 border-t-0 border-b-2 border-foreground/30 bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0";

const Login = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const { handleGoogleLogin } = useAuth();
	const { BASE_URL, refreshAuth } = useAuthContext();
	const location = useLocation();
	const navigate = useNavigate();

	// ProtectedRoute's own "Sign In" link (and UnsavedProgressDialog's) both
	// set this — stash it now since the Google OAuth round-trip is a
	// full-page redirect that drops React Router's in-memory state.
	// GoogleCallback.tsx reads it back once auth completes.
	useEffect(() => {
		const from = (location.state as { from?: Location } | null)?.from;
		if (from) stashPostLoginRedirect(from);
	}, [location.state]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await loginWithPassword(BASE_URL, email, password);
			await refreshAuth();

			// Mirrors GoogleCallback.tsx's post-login flow, so a guest who
			// chose "Sign In" from UnsavedProgressDialog (which stashes a
			// pending session before redirecting here) gets it restored
			// regardless of which auth method they end up using.
			const redirectPath = consumePostLoginRedirect() ?? "/dashboard";
			const session = await restorePendingSession();
			if (session) {
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
		} catch (err) {
			const message =
				(err as { response?: { data?: { error?: string } } })?.response
					?.data?.error ?? "Login failed. Please try again.";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleGithubLogin = () => {
		// TODO: Implement GitHub OAuth
		console.log("GitHub login");
	};

	return (
		<div className="flex min-h-screen bg-background">
			{/* Poster panel */}
			<div className="relative hidden w-[42%] shrink-0 flex-col justify-between bg-foreground p-10 text-background lg:flex">
				<Link
					to="/"
					className="flex items-center gap-2 font-playfair text-3xl font-bold italic tracking-tight"
				>
					<GencMark className="h-7 w-7 shrink-0 text-primary" />
					genC
				</Link>
				<div>
					
					<h2 className="mt-4 font-playfair text-5xl italic leading-[1.05]">
						Good to see
						<br />
						you again.
					</h2>
					<p className="mt-4 max-w-xs text-sm leading-relaxed text-background/70">
						Sign back in to keep designing, organizing, and sending
						certificates that people actually want to frame.
					</p>
				</div>
				<p className="font-hand text-2xl text-background/80">
					— The Certificate Desk
				</p>
			</div>

			{/* Form panel */}
			<div className="flex flex-1 items-center justify-center px-6 py-16">
				<div className="w-full max-w-sm space-y-8">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
							Sign In
						</p>
						<h1 className="mt-1 font-playfair text-3xl italic text-foreground">
							Welcome back
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Sign in to your account to continue
						</p>
					</div>

					<div className="space-y-3">
						<AuthButton
							onClick={handleGoogleLogin}
							label="Continue with Google"
							svg={<GoogleSvg />}
						/>
						<AuthButton
							onClick={handleGithubLogin}
							label="Continue with GitHub"
							svg={<GitHubSvg />}
						/>
					</div>

					<div className="flex items-center gap-3">
						<div className="h-px flex-1 bg-border" />
						<span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
							or
						</span>
						<div className="h-px flex-1 bg-border" />
					</div>

					<form onSubmit={handleSubmit} className="space-y-5">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="name@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className={fieldClass}
								required
							/>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Password</Label>
								<Link
									to="/forgot-password"
									className="text-xs text-primary hover:underline"
								>
									Forgot password?
								</Link>
							</div>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className={`${fieldClass} pr-8`}
									required
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>

						<Button
							type="submit"
							disabled={submitting}
							className="h-11 w-full font-semibold uppercase tracking-widest"
						>
							{submitting ? "Signing In..." : "Sign In"}
						</Button>
					</form>

					<p className="text-center text-sm text-muted-foreground">
						Don't have an account?{" "}
						<Link
							to="/signup"
							className="font-medium text-primary hover:underline"
						>
							Sign up
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Login;
