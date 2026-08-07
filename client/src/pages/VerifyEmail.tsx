import GencMark from "@/components/GencMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/hooks/useAuthContext";
import { consumePostLoginRedirect } from "@/lib/postLoginRedirect";
import { restorePendingSession } from "@/lib/pendingSession";
import { resendVerificationCode, verifyEmailCode } from "@/services/authApi";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useNavigate } from "react-router-dom";

const fieldClass =
	"rounded-none border-x-0 border-t-0 border-b-2 border-foreground/30 bg-transparent px-0 text-base text-center tracking-[0.5em] focus-visible:border-primary focus-visible:ring-0";

const VerifyEmail = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { BASE_URL, refreshAuth } = useAuthContext();
	const email = (location.state as { email?: string } | null)?.email ?? "";
	const [code, setCode] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [resending, setResending] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) {
			toast.error("Missing email — please sign up again.");
			return;
		}
		setSubmitting(true);
		try {
			await verifyEmailCode(BASE_URL, email, code);
			await refreshAuth();

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
			toast.success("Email verified — welcome to genC!");
		} catch (err) {
			const message =
				(err as { response?: { data?: { error?: string } } })?.response
					?.data?.error ?? "Verification failed. Please try again.";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleResend = async () => {
		if (!email) return;
		setResending(true);
		try {
			await resendVerificationCode(BASE_URL, email);
			toast.success("A new code is on its way.");
		} catch {
			toast.error("Failed to resend the code. Please try again shortly.");
		} finally {
			setResending(false);
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
						Verify Email
					</p>
					<h1 className="mt-1 font-playfair text-3xl italic text-foreground">
						Check your inbox
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{email
							? `Enter the 6-digit code we sent to ${email}`
							: "Enter the 6-digit code we sent you"}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="code">Verification code</Label>
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

					<Button
						type="submit"
						disabled={submitting || code.length !== 6}
						className="h-11 w-full font-semibold uppercase tracking-widest"
					>
						{submitting ? "Verifying..." : "Verify Email"}
					</Button>
				</form>

				<p className="text-center text-sm text-muted-foreground">
					Didn't get a code?{" "}
					<button
						type="button"
						onClick={handleResend}
						disabled={resending}
						className="font-medium text-primary hover:underline disabled:opacity-50"
					>
						{resending ? "Sending..." : "Resend"}
					</button>
				</p>
			</div>
		</div>
	);
};

export default VerifyEmail;
