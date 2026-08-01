import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Recipient } from "@/types/TextField";
import { motion } from "framer-motion";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RecipientManagerProps {
	recipients: Recipient[];
	onRecipientsChange: (recipients: Recipient[]) => void;
	onGenerateAll?: () => void;
}

const RecipientManager = ({
	recipients,
	onRecipientsChange,
	onGenerateAll,
}: RecipientManagerProps) => {
	const [newName, setNewName] = useState("");
	const [newEmail, setNewEmail] = useState("");

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const fileType = file.name.split(".").pop()?.toLowerCase();

		try {
			const text = await file.text();
			let parsedRecipients: Recipient[] = [];

			if (fileType === "json") {
				const data = JSON.parse(text);
				parsedRecipients = Array.isArray(data) ? data : [data];
			} else if (fileType === "csv") {
				const lines = text.split("\n").filter((line) => line.trim());
				const hasHeader =
					lines[0].toLowerCase().includes("name") ||
					lines[0].toLowerCase().includes("email");
				const dataLines = hasHeader ? lines.slice(1) : lines;

				parsedRecipients = dataLines.map((line) => {
					const [name, email] = line.split(",").map((s) => s.trim());
					return { name, email };
				});
			}

			// Validate recipients
			const validRecipients = parsedRecipients.filter(
				(r) => r.name && r.email
			);

			if (validRecipients.length === 0) {
				toast.error("No valid recipients found in file");
				return;
			}

			onRecipientsChange([...recipients, ...validRecipients]);
			toast.success(`Added ${validRecipients.length} recipient(s)`);
		} catch (error) {
			toast.error("Failed to parse file. Please check the format.");
		}

		e.target.value = "";
	};

	const handleAddManual = () => {
		if (!newName.trim() || !newEmail.trim()) {
			toast.error("Please enter both name and email");
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(newEmail)) {
			toast.error("Please enter a valid email address");
			return;
		}

		onRecipientsChange([
			...recipients,
			{ name: newName.trim(), email: newEmail.trim() },
		]);
		setNewName("");
		setNewEmail("");
		toast.success("Recipient added");
	};

	const handleRemove = (index: number) => {
		onRecipientsChange(recipients.filter((_, i) => i !== index));
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="space-y-4"
		>
			{/* Add manually + upload */}
			<div className="flex gap-2">
				<Input
					placeholder="Name"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
					className="flex-1"
					maxLength={100}
				/>
				<Input
					placeholder="Email"
					type="email"
					value={newEmail}
					onChange={(e) => setNewEmail(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
					className="flex-1"
					maxLength={100}
				/>
				<Button onClick={handleAddManual} size="icon" className="shrink-0">
					<Plus className="w-4 h-4" />
				</Button>
			</div>

			<label htmlFor="recipients-upload" className="block pt-2">
				<input
					id="recipients-upload"
					type="file"
					accept=".csv,.json"
					onChange={handleFileUpload}
					className="hidden"
				/>
				<Button
					variant="outline"
					size="sm"
					className="w-full justify-center gap-2 text-muted-foreground"
					asChild
				>
					<span>
						<Upload className="w-3.5 h-3.5" />
						Upload CSV or JSON instead
					</span>
				</Button>
			</label>

			{/* Recipients List */}
			{recipients.length > 0 && (
				<div className="space-y-2">
					<Label className="text-xs text-muted-foreground">
						{recipients.length} added
					</Label>
					<ScrollArea className="h-40 border border-border rounded-lg">
						<div className="space-y-1.5 p-2">
							{recipients.map((recipient, index) => (
								<div
									key={index}
									className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 hover:bg-muted transition-smooth"
								>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{recipient.name}
										</p>
										<p className="text-xs text-muted-foreground truncate">
											{recipient.email}
										</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleRemove(index)}
										className="ml-2 h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</Button>
								</div>
							))}
						</div>
					</ScrollArea>

					{onGenerateAll && (
						<Button
							onClick={onGenerateAll}
							className="w-full gap-2"
							size="sm"
						>
							<Download className="w-4 h-4" />
							Generate All ({recipients.length})
						</Button>
					)}
				</div>
			)}
		</motion.div>
	);
};

export default RecipientManager;
