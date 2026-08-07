import AuthButton from "@/components/AuthButton";
import GencMark from "@/components/GencMark";
import { Button } from "@/components/ui/button";
import GitHubSvg from "@/components/ui/GitHubSvg";
import GoogleSvg from "@/components/ui/GoogleSvg";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useAuth from "@/hooks/useAuth";
import { useAuthContext } from "@/hooks/useAuthContext";
import { registerAccount } from "@/services/authApi";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

const fieldClass =
	"rounded-none border-x-0 border-t-0 border-b-2 border-foreground/30 bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0";

const Signup = () => {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const { handleGoogleLogin: handleGoogleSignup } = useAuth();
	const { BASE_URL } = useAuthContext();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			toast.error("Passwords don't match.");
			return;
		}
		setSubmitting(true);
		try {
			await registerAccount(BASE_URL, name, email, password);
			toast.success("Account created — check your inbox for a code.");
			navigate("/verify-email", { state: { email } });
		} catch (err) {
			const message =
				(err as { response?: { data?: { error?: string } } })?.response
					?.data?.error ?? "Signup failed. Please try again.";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleGithubSignup = () => {
		// TODO: Implement GitHub OAuth
		console.log("GitHub signup");
	};

	return (
		<div className="flex min-h-screen bg-background">
			{/* Poster panel */}
			<div className="relative hidden w-[42%] shrink-0 flex-col justify-between bg-secondary p-10 text-secondary-foreground lg:flex">
				<Link
					to="/"
					className="flex items-center gap-2 font-playfair text-3xl font-bold italic tracking-tight"
				>
					<GencMark className="h-7 w-7 shrink-0 text-primary" />
					genC
				</Link>
				<div>
					<h2 className="mt-4 font-playfair text-5xl italic leading-[1.05]">
						Join the
						<br />
						desk.
					</h2>
					<p className="mt-4 max-w-xs text-sm leading-relaxed text-secondary-foreground/80">
						Design certificate templates, organize them into
						collections, and let recipients generate their own —
						free to start.
					</p>
				</div>
				<p className="font-hand text-2xl text-secondary-foreground/90">
					— The Certificate Desk
				</p>
			</div>

			{/* Form panel */}
			<div className="flex flex-1 items-center justify-center px-6 py-16">
				<div className="w-full max-w-sm space-y-8">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
							Create Account
						</p>
						<h1 className="mt-1 font-playfair text-3xl italic text-foreground">
							Join genC
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Get started with your free account
						</p>
					</div>

					<div className="space-y-3">
						<AuthButton
							onClick={handleGoogleSignup}
							label="Continue with Google"
							svg={<GoogleSvg />}
						/>
						<AuthButton
							onClick={handleGithubSignup}
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
							<Label htmlFor="name">Full name</Label>
							<Input
								id="name"
								type="text"
								placeholder="John Doe"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className={fieldClass}
								required
							/>
						</div>

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
							<Label htmlFor="password">Password</Label>
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
							<p className="text-xs text-muted-foreground">
								Must be at least 8 characters
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm password</Label>
							<Input
								id="confirmPassword"
								type={showPassword ? "text" : "password"}
								placeholder="••••••••"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className={fieldClass}
								required
							/>
						</div>

						<Button
							type="submit"
							disabled={submitting}
							className="h-11 w-full font-semibold uppercase tracking-widest"
						>
							{submitting ? "Creating..." : "Create Account"}
						</Button>
					</form>

					<p className="text-center text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link
							to="/login"
							className="font-medium text-primary hover:underline"
						>
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Signup;
