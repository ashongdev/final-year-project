import GencMark from "@/components/GencMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/hooks/useAuthContext";
import { requestPasswordReset } from "@/services/authApi";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

const fieldClass =
	"rounded-none border-x-0 border-t-0 border-b-2 border-foreground/30 bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0";

const ForgotPassword = () => {
	const { BASE_URL } = useAuthContext();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await requestPasswordReset(BASE_URL, email);
			toast.success("If that email exists, a reset code is on its way.");
			navigate("/reset-password", { state: { email } });
		} catch {
			toast.error("Something went wrong. Please try again.");
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
						Forgot your password?
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Enter your email and we'll send you a reset code
					</p>
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

					<Button
						type="submit"
						disabled={submitting}
						className="h-11 w-full font-semibold uppercase tracking-widest"
					>
						{submitting ? "Sending..." : "Send Reset Code"}
					</Button>
				</form>

				<p className="text-center text-sm text-muted-foreground">
					Remembered it?{" "}
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

export default ForgotPassword;
