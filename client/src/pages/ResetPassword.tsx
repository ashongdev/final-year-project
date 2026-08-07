import GencMark from "@/components/GencMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/hooks/useAuthContext";
import { confirmPasswordReset } from "@/services/authApi";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useNavigate } from "react-router-dom";

const fieldClass =
	"rounded-none border-x-0 border-t-0 border-b-2 border-foreground/30 bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0";

const ResetPassword = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { BASE_URL } = useAuthContext();
	const email = (location.state as { email?: string } | null)?.email ?? "";
	const [code, setCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) {
			toast.error("Missing email — please request a new reset code.");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("Passwords don't match.");
			return;
		}
		setSubmitting(true);
		try {
			await confirmPasswordReset(BASE_URL, email, code, newPassword);
			toast.success("Password reset — you can now sign in.");
			navigate("/login");
		} catch (err) {
			const message =
				(err as { response?: { data?: { error?: string } } })?.response
					?.data?.error ?? "Reset failed. Please try again.";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-6">
			<div className="w-full max-w-sm space-y-8">
				<div className="flex flex-col items-center text-center">
					<Link
						to="/"
						className="flex items-center gap-2 font-playfair text-3xl font-bold italic tracking-tight"
					>
						<GencMark className="h-7 w-7 shrink-0 text-primary" />
						genC
					</Link>
					<p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
						Reset Password
					</p>
					<h1 className="mt-1 font-playfair text-3xl italic text-foreground">
						Set a new password
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{email
							? `Enter the code we sent to ${email}`
							: "Enter the code from your email"}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="code">Reset code</Label>
						<Input
							id="code"
							type="text"
							inputMode="numeric"
							maxLength={6}
							placeholder="000000"
							value={code}
							onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
							className={fieldClass}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="newPassword">New password</Label>
						<div className="relative">
							<Input
								id="newPassword"
								type={showPassword ? "text" : "password"}
								placeholder="••••••••"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
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
						<Label htmlFor="confirmPassword">Confirm new password</Label>
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
						{submitting ? "Resetting..." : "Reset Password"}
					</Button>
				</form>

				<p className="text-center text-sm text-muted-foreground">
					Remembered it after all?{" "}
					<Link
						to="/login"
						className="font-medium text-primary hover:underline"
					>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
};

export default ResetPassword;
