import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/hooks/useAuthContext";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const fieldClass =
	"rounded-none border-x-0 border-t-0 border-b-2 border-foreground/30 bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0";

const AccountSettingsTab = () => {
	const { userName, user } = useAuthContext();
	const [name, setName] = useState(userName || "Jane Doe");
	const [email, setEmail] = useState(user?.email ?? "jane@example.com");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const initials =
		name
			.trim()
			.split(/\s+/)
			.map((n) => n[0])
			.slice(0, 2)
			.join("")
			.toUpperCase() || "?";

	const handleProfileSave = () => {
		toast.success("Profile updated successfully.");
	};

	const handlePasswordChange = () => {
		if (!currentPassword || !newPassword) {
			toast.error("Please fill in all password fields.");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match.");
			return;
		}
		toast.success("Password changed successfully.");
		setCurrentPassword("");
		setNewPassword("");
		setConfirmPassword("");
	};

	return (
		<div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
			{/* ID card */}
			<div className="lg:col-span-4">
				<div className="w-full max-w-xs -rotate-1 border-2 border-foreground bg-card p-6 shadow-[5px_5px_0_hsl(var(--foreground)/0.15)]">
					<p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
						Member Since Vol. I
					</p>
					<div className="mt-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-foreground bg-secondary font-playfair text-2xl italic text-secondary-foreground">
						{initials}
					</div>
					<p className="font-hand mt-4 text-3xl text-foreground">
						{name || "Your name"}
					</p>
					<p className="mt-1 truncate text-xs text-muted-foreground">
						{email}
					</p>
					<div className="mt-4 border-t border-dashed border-border pt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
						Certificate Studio · Editor Access
					</div>
				</div>
			</div>

			{/* Forms */}
			<div className="space-y-12 lg:col-span-8">
				<section>
					<p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
						01. Profile Information
					</p>
					<div className="mt-5 space-y-6 border-t border-border pt-6">
						<div className="space-y-2">
							<Label htmlFor="name">Full Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className={fieldClass}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className={fieldClass}
							/>
						</div>
						<button
							onClick={handleProfileSave}
							className="border-2 border-foreground bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
						>
							Save Changes
						</button>
					</div>
				</section>

				<section>
					<p className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
						02. Change Password
					</p>
					<div className="mt-5 space-y-6 border-t border-border pt-6">
						<div className="space-y-2">
							<Label htmlFor="current-pw">Current Password</Label>
							<Input
								id="current-pw"
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								className={fieldClass}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-pw">New Password</Label>
							<Input
								id="new-pw"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								className={fieldClass}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-pw">
								Confirm New Password
							</Label>
							<Input
								id="confirm-pw"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className={fieldClass}
							/>
						</div>
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<ShieldCheck className="h-3.5 w-3.5" />
							Use at least 8 characters with a mix of letters
							and numbers.
						</p>
						<button
							onClick={handlePasswordChange}
							className="border-2 border-foreground bg-secondary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-secondary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
						>
							Update Password
						</button>
					</div>
				</section>
			</div>
		</div>
	);
};

export default AccountSettingsTab;
