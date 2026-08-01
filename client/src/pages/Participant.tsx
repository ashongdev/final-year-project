import CertificatePreview from "@/components/CertificatePreview";
import Header from "@/components/Header";
import ParticipantControlPanel from "@/components/ParticipantControlPanel";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
	participantPageTourSteps,
	TOUR_STORAGE_KEYS,
} from "@/config/tourSteps";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useTour } from "@/hooks/useTour";
import { logEvent } from "@/lib/analytics";
import { extractUpgradeErrorFromBlob } from "@/lib/billingErrors";
import { DEFAULT_DATE_FORMAT } from "@/lib/fieldPresets";
import api from "@/services/axios";
import { TextField } from "@/types/TextField";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
	AlertCircle,
	CalendarIcon,
	Loader2,
	Mail,
	Search,
	Share2,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

/**
 * /generate/ is called with responseType: "blob", so an error response body
 * arrives as a Blob too (not parsed JSON) — read its text to check whether
 * the server rejected the request because the certificate is gated behind
 * recipient email verification.
 */
const isGatedError = async (error: unknown): Promise<boolean> => {
	if (!axios.isAxiosError(error) || error.response?.status !== 403) {
		return false;
	}
	const data = error.response.data;
	if (!(data instanceof Blob)) return Boolean((data as { gated?: boolean })?.gated);
	try {
		const parsed = JSON.parse(await data.text());
		return Boolean(parsed?.gated);
	} catch {
		return false;
	}
};

const Participant = () => {
	const { BASE_URL } = useAuthContext();
	const [searchParams, setSearchParams] = useSearchParams();

	const { startTour, resetTour } = useTour({
		steps: participantPageTourSteps,
		storageKey: TOUR_STORAGE_KEYS.participant,
		autoStart: true,
	});

	const [certificateId, setCertificateId] = useState(
		searchParams.get("id") || "",
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [templateUrl, setTemplateUrl] = useState<string | null>(null);
	const [templateLoaded, setTemplateLoaded] = useState(false);

	const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
	const [selectedFont, setSelectedFont] = useState(
		"Bickham Script Pro Regular",
	);
	const [fontSize, setFontSize] = useState(100);
	const [fontWeight, setFontWeight] = useState("400");
	const [textColor, setTextColor] = useState("#000000");
	const [participantName, setParticipantName] = useState("");
	const [inputValues, setInputValues] = useState<Record<string, string>>({});
	// ISO date backing each date-preset field's picker, keyed by field id —
	// separate from inputValues, which holds the final formatted display text.
	const [dateValues, setDateValues] = useState<Record<string, string>>({});
	const [anchorMode, setAnchorMode] = useState<"center" | "left">("center");
	const [isDownloading, setIsDownloading] = useState(false);
	const [isLocalDraft, setIsLocalDraft] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [showShareDialog, setShowShareDialog] = useState(false);
	const [generatedLink, setGeneratedLink] = useState("");

	const [fields, setFields] = useState<TextField[]>([]);

	// New state for shared link flow
	const [isSharedLinkFlow, setIsSharedLinkFlow] = useState(false);
	const [showNameInputDialog, setShowNameInputDialog] = useState(false);
	const [hasDownloaded, setHasDownloaded] = useState(false);

	// Recipient email verification (only kicks in when the organizer set a
	// recipients allow-list for this certificate — see /generate/'s `gated`
	// response). Ungated certificates never touch any of this.
	const [needsVerification, setNeedsVerification] = useState(false);
	const [verificationStep, setVerificationStep] = useState<"email" | "code">(
		"email",
	);
	const [verificationEmail, setVerificationEmail] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [verificationError, setVerificationError] = useState<string | null>(
		null,
	);
	const [isSendingCode, setIsSendingCode] = useState(false);
	const [isVerifyingCode, setIsVerifyingCode] = useState(false);
	const [verificationToken, setVerificationToken] = useState<string | null>(
		null,
	);
	const isNameVerified = !!verificationToken;

	const previewRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);

	// Auto-load if ID is in URL (shared link flow)
	useEffect(() => {
		const id = searchParams.get("id");

		// Legacy parameters
		const font = searchParams.get("font");
		const size = searchParams.get("size");
		const weight = searchParams.get("weight");
		const color = searchParams.get("color");
		const x = searchParams.get("x");
		const y = searchParams.get("y");
		const anchor = searchParams.get("anchor");

		// New encoded data parameter
		const dataEncoded = searchParams.get("data");

		if (id) {
			setCertificateId(id);

			if (dataEncoded) {
				try {
					const parsedFields: TextField[] = JSON.parse(
						atob(dataEncoded),
					);
					setFields(parsedFields);

					const initialValues: Record<string, string> = {};
					parsedFields.forEach((f, i) => {
						// Initialize input values with the template text
						if (f.required || i === 0) {
							initialValues[f.id] = f.text;
						}
					});
					setInputValues(initialValues);

					if (parsedFields.length > 0) {
						const mainField = parsedFields[0];
						setParticipantName(mainField.text);
						setSelectedFont(mainField.font);
						setFontSize(mainField.fontSize);
						setFontWeight(mainField.fontWeight);
						setTextColor(mainField.color);
						setTextPosition({ x: mainField.x, y: mainField.y });
						setAnchorMode(mainField.anchorMode);
					}

					setIsSharedLinkFlow(true);
					handleFetchTemplate(id, true);
				} catch (e) {
					console.error("Failed to parse field data", e);
					handleFetchTemplate(id, false);
				}
			} else if (font && size && weight && color && x && y) {
				setSelectedFont(font);
				setFontSize(Number(size));
				setFontWeight(weight);
				setTextColor(color);
				setTextPosition({ x: Number(x), y: Number(y) });
				setAnchorMode(anchor as "center" | "left");

				setFields([
					{
						id: "legacy",
						label: "Participant Name",
						text: "",
						x: Number(x),
						y: Number(y),
						font: font,
						fontSize: Number(size),
						fontWeight: weight,
						color: color,
						anchorMode: (anchor as "center" | "left") || "center",
					},
				]);

				setIsSharedLinkFlow(true);
				handleFetchTemplate(id, true);
			} else {
				handleFetchTemplate(id, false);
			}
		}
	}, [searchParams]);

	// Restore a previously-verified token for this certificate (e.g. after a
	// page refresh) so returning recipients don't have to re-verify by email
	// every single visit within the token's lifetime.
	useEffect(() => {
		if (!certificateId) return;
		const stored = sessionStorage.getItem(`cert-verify-${certificateId}`);
		if (!stored) {
			setVerificationToken(null);
			return;
		}
		try {
			const { token, email } = JSON.parse(stored) as {
				token: string;
				email: string;
			};
			if (token) {
				setVerificationToken(token);
				setVerificationEmail(email ?? "");
			}
		} catch {
			sessionStorage.removeItem(`cert-verify-${certificateId}`);
		}
	}, [certificateId]);

	const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;

	const handlePublish = async () => {
		if (!selectedFile) return;

		const toastId = toast.loading("Uploading and saving configuration...");

		try {
			const formData = new FormData();
			formData.append("template", selectedFile);
			formData.append("selectedFont", selectedFont);
			formData.append("fontSize", fontSize.toString());
			formData.append("fontWeight", fontWeight);
			formData.append("textColor", textColor);
			formData.append("x", textPosition.x.toString());
			formData.append("y", textPosition.y.toString());
			formData.append("anchorMode", anchorMode);

			const res = await api.post(`${BASE_URL}/upload/`, formData);

			if (res.data.public_id) {
				const newId = res.data.public_id;
				setCertificateId(newId);
				setSearchParams({ id: newId });
				setIsLocalDraft(false);
				setSelectedFile(null);

				const link = `${window.location.origin}/participant?id=${newId}`;
				setGeneratedLink(link);
				setShowShareDialog(true);

				toast.dismiss(toastId);
				toast.success("Published successfully!");
			}
		} catch (error) {
			console.error(error);
			toast.dismiss(toastId);
			toast.error("Failed to publish.");
		}
	};

	const handleFetchTemplate = async (
		id?: string,
		isFromSharedLink = false,
	) => {
		const idToUse = id || certificateId;

		if (!idToUse.trim()) {
			setError("Please enter a certificate ID");
			return;
		}

		setIsLoading(true);
		setError(null);
		setTemplateLoaded(false);

		if (idToUse.toLowerCase().includes("error")) {
			setError(
				"Failed to fetch template. Please check the ID and try again.",
			);
			setTemplateUrl(null);
			setIsLoading(false);
			return;
		}

		if (idToUse.toLowerCase().includes("notfound")) {
			setError(
				"Certificate template not found. The ID may be invalid or expired.",
			);
			setTemplateUrl(null);
			setIsLoading(false);
			return;
		}

		const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${idToUse}.png`;
		try {
			const res = await axios.head(url);
			if (res.status !== 200) throw new Error("Template not found");
			setTemplateUrl(url);
			setTemplateLoaded(true);

			if (isFromSharedLink) {
				setShowNameInputDialog(true);
			} else {
				toast.success("Template loaded successfully!");
			}
		} catch {
			toast.error("Template not found. Check the ID.");
			setError("Template not found. Check the ID.");
			setTemplateLoaded(false);
		} finally {
			setIsLoading(false);
		}
	};

	const handleFieldMove = (_id: string, x: number, y: number) => {
		setTextPosition({ x, y });
		setFields((prev) =>
			prev.length > 0
				? prev.map((f, i) => (i === 0 ? { ...f, x, y } : f))
				: prev,
		);
	};

	// Arrow-key nudging for the participant's own field, direct on the canvas.
	useEffect(() => {
		if (isSharedLinkFlow || !templateLoaded) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (showShareDialog || showNameInputDialog) return;
			const tag = (document.activeElement?.tagName || "").toLowerCase();
			if (["input", "textarea", "select"].includes(tag)) return;

			const step = e.shiftKey ? 10 : 1;
			switch (e.key) {
				case "ArrowUp":
					e.preventDefault();
					handleFieldMove("preview", textPosition.x, textPosition.y - step);
					break;
				case "ArrowDown":
					e.preventDefault();
					handleFieldMove("preview", textPosition.x, textPosition.y + step);
					break;
				case "ArrowLeft":
					e.preventDefault();
					handleFieldMove("preview", textPosition.x - step, textPosition.y);
					break;
				case "ArrowRight":
					e.preventDefault();
					handleFieldMove("preview", textPosition.x + step, textPosition.y);
					break;
				default:
					return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isSharedLinkFlow,
		templateLoaded,
		showShareDialog,
		showNameInputDialog,
		textPosition,
	]);

	const handleDownload = async () => {
		if (!participantName.trim()) {
			toast.error("Please enter your name");
			return;
		}

		setIsDownloading(true);
		if (!templateUrl) {
			toast.error("Please upload a template first");
			return;
		}

		toast.success("Generating certificates...");

		try {
			// Update fields with input values
			let currentFields = [...fields];
			if (currentFields.length > 0) {
				currentFields = currentFields.map((f, i) => ({
					...f,
					text:
						f.required || i === 0
							? inputValues[f.id] !== undefined
								? inputValues[f.id]
								: f.text
							: f.text,
				}));

				// Update first field with potential style overrides
				currentFields[0] = {
					...currentFields[0],
					x: textPosition.x,
					y: textPosition.y,
					font: selectedFont,
					fontSize: fontSize,
					fontWeight: fontWeight,
					color: textColor,
					anchorMode: anchorMode,
				};
			} else {
				// Fallback if no fields exist yet
				currentFields = [
					{
						id: "participant",
						label: "Participant Name",
						text: participantName,
						x: textPosition.x,
						y: textPosition.y,
						font: selectedFont,
						fontSize: fontSize,
						fontWeight: fontWeight,
						color: textColor,
						anchorMode: anchorMode,
					},
				];
			}

			const response = await api.post(
				`${BASE_URL}/generate/`,
				{
					textPosition: {
						x: textPosition.x,
						y: textPosition.y,
					},
					selectedFont,
					fontSize: fontSize,
					fontWeight,
					textColor,
					anchorMode,
					certificateId,
					participantName,
					fields: JSON.stringify(currentFields),
					verificationToken: verificationToken ?? undefined,
				},
				{ responseType: "blob" },
			);

			const url = window.URL.createObjectURL(response.data);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${participantName}.png`;
			link.click();
			window.URL.revokeObjectURL(url);

			logEvent("Certificate", "Generate", "Participant Generation");

			toast.success("Download Complete.");
		} catch (error) {
			const gated = await isGatedError(error);
			const upgradeMessage = await extractUpgradeErrorFromBlob(error);
			if (gated) {
				setShowNameInputDialog(false);
				setNeedsVerification(true);
				setVerificationStep("email");
			} else if (upgradeMessage) {
				toast.error(upgradeMessage);
			} else {
				toast.error("Failed to generate certificates");
			}
		} finally {
			setIsDownloading(false);
		}
	};

	const handleSharedFlowDownload = async () => {
		const missingFields = fields.filter(
			(f, i) => (f.required || i === 0) && !inputValues[f.id]?.trim(),
		);

		if (missingFields.length > 0) {
			toast.error(`Please enter: ${missingFields[0].label}`);
			return;
		}

		if (fields.length === 0 && !participantName.trim()) {
			toast.error("Please enter your name");
			return;
		}

		setShowNameInputDialog(false);
		await handleDownload();
		setHasDownloaded(true);
	};

	const handleNameInputKeyDown = (
		e: React.KeyboardEvent<HTMLInputElement>,
	) => {
		if (e.key === "Enter") {
			handleSharedFlowDownload();
		}
	};

	const handleSendCode = async () => {
		if (!verificationEmail.trim()) {
			setVerificationError("Please enter your email");
			return;
		}
		setIsSendingCode(true);
		setVerificationError(null);
		try {
			await api.post(`${BASE_URL}/participant/request-code/`, {
				certificateId,
				email: verificationEmail.trim(),
			});
			setVerificationStep("code");
			toast.success("Verification code sent");
		} catch (error) {
			const message = axios.isAxiosError(error)
				? (error.response?.data as { error?: string })?.error
				: undefined;
			setVerificationError(message ?? "Failed to send verification code.");
		} finally {
			setIsSendingCode(false);
		}
	};

	const handleVerifyCode = async () => {
		if (!verificationCode.trim()) {
			setVerificationError("Please enter the code");
			return;
		}
		setIsVerifyingCode(true);
		setVerificationError(null);
		try {
			const res = await api.post(`${BASE_URL}/participant/verify-code/`, {
				certificateId,
				email: verificationEmail.trim(),
				code: verificationCode.trim(),
			});
			const token = res.data.token as string;
			const verifiedName = res.data.name as string;

			setVerificationToken(token);
			sessionStorage.setItem(
				`cert-verify-${certificateId}`,
				JSON.stringify({ token, email: verificationEmail.trim() }),
			);

			setParticipantName(verifiedName);
			setInputValues((prev) => {
				const next = { ...prev };
				if (fields.length > 0) next[fields[0].id] = verifiedName;
				return next;
			});

			setNeedsVerification(false);
			setVerificationCode("");
			toast.success("Verified! Click Generate to download your certificate.");

			if (isSharedLinkFlow) {
				setShowNameInputDialog(true);
			}
		} catch (error) {
			const message = axios.isAxiosError(error)
				? (error.response?.data as { error?: string })?.error
				: undefined;
			setVerificationError(message ?? "Invalid or expired code.");
		} finally {
			setIsVerifyingCode(false);
		}
	};

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header */}
			<Header
				onTourClick={() => {
					resetTour();
					startTour();
				}}
			/>

			{/* Name Input Dialog for Shared Link Flow */}
			<Dialog
				open={showNameInputDialog}
				onOpenChange={setShowNameInputDialog}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-xl">
							Enter Your Name
						</DialogTitle>
						<DialogDescription>
							Type your name below to generate your personalized
							certificate.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-4">
						{fields.length > 0 ? (
							fields
								.filter((f, i) => f.required || i === 0)
								.map((field) => {
									const isPrimary = fields.indexOf(field) === 0;
									const locked = isPrimary && isNameVerified;
									return (
										<div className="space-y-2" key={field.id}>
											<Label
												htmlFor={`field-${field.id}`}
												className="flex items-center gap-1.5"
											>
												{field.label}
												{locked && (
													<ShieldCheck className="h-3.5 w-3.5 text-primary" />
												)}
											</Label>
											{field.preset === "date" ? (
												<Popover>
													<PopoverTrigger asChild>
														<button
															id={`field-${field.id}`}
															className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm"
														>
															<CalendarIcon className="h-4 w-4 text-muted-foreground" />
															{inputValues[field.id] ||
																`Select ${field.label}...`}
														</button>
													</PopoverTrigger>
													<PopoverContent className="w-auto p-0" align="start">
														<Calendar
															mode="single"
															selected={
																dateValues[field.id]
																	? parseISO(dateValues[field.id])
																	: undefined
															}
															onSelect={(date) => {
																if (!date) return;
																const dateFormat =
																	field.dateFormat ??
																	DEFAULT_DATE_FORMAT;
																setDateValues((prev) => ({
																	...prev,
																	[field.id]: format(
																		date,
																		"yyyy-MM-dd",
																	),
																}));
																setInputValues((prev) => ({
																	...prev,
																	[field.id]: format(
																		date,
																		dateFormat,
																	),
																}));
															}}
															initialFocus
														/>
													</PopoverContent>
												</Popover>
											) : (
												<Input
													id={`field-${field.id}`}
													value={inputValues[field.id] || ""}
													disabled={locked}
													onChange={(e) => {
														setInputValues((prev) => ({
															...prev,
															[field.id]: e.target.value,
														}));
														if (isPrimary) {
															setParticipantName(
																e.target.value,
															);
														}
													}}
													onKeyDown={handleNameInputKeyDown}
													placeholder={`Enter ${field.label}...`}
												/>
											)}
										</div>
									);
								})
						) : (
							<div className="space-y-2">
								<Label
									htmlFor="participant-name"
									className="flex items-center gap-1.5"
								>
									Your Name
									{isNameVerified && (
										<ShieldCheck className="h-3.5 w-3.5 text-primary" />
									)}
								</Label>
								<Input
									id="participant-name"
									value={participantName}
									disabled={isNameVerified}
									onChange={(e) => {
										setParticipantName(e.target.value);
										// Update first field if no required flags found (legacy fallback)
										if (fields.length > 0) {
											setInputValues((prev) => ({
												...prev,
												[fields[0].id]: e.target.value,
											}));
										}
									}}
									onKeyDown={handleNameInputKeyDown}
									placeholder="Enter your full name..."
									autoFocus
								/>
							</div>
						)}

						<Button
							onClick={handleSharedFlowDownload}
							disabled={isDownloading}
							className="w-full"
						>
							{isDownloading ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : null}
							Generate & Download Certificate
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Recipient Email Verification Dialog */}
			<Dialog
				open={needsVerification}
				onOpenChange={(open) => {
					setNeedsVerification(open);
					if (!open) setVerificationError(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-xl">
							<ShieldCheck className="w-5 h-5 text-primary" />
							Verify Your Email
						</DialogTitle>
						<DialogDescription>
							This certificate is restricted to its recipient list.
							Verify the email address you were invited with to
							continue.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						{verificationStep === "email" ? (
							<div className="space-y-2">
								<Label htmlFor="verify-email">
									Email Address
								</Label>
								<Input
									id="verify-email"
									type="email"
									value={verificationEmail}
									onChange={(e) => {
										setVerificationEmail(e.target.value);
										setVerificationError(null);
									}}
									onKeyDown={(e) =>
										e.key === "Enter" && handleSendCode()
									}
									placeholder="you@example.com"
									autoFocus
								/>
							</div>
						) : (
							<div className="space-y-2">
								<Label htmlFor="verify-code">
									Verification Code
								</Label>
								<Input
									id="verify-code"
									value={verificationCode}
									onChange={(e) => {
										setVerificationCode(e.target.value);
										setVerificationError(null);
									}}
									onKeyDown={(e) =>
										e.key === "Enter" && handleVerifyCode()
									}
									placeholder="6-digit code"
									className="font-mono text-center tracking-widest"
									maxLength={6}
									autoFocus
								/>
								<p className="text-xs text-muted-foreground">
									Sent to {verificationEmail}.{" "}
									<button
										type="button"
										className="underline hover:text-foreground"
										onClick={() => {
											setVerificationStep("email");
											setVerificationError(null);
										}}
									>
										Use a different email
									</button>
								</p>
							</div>
						)}

						{verificationError && (
							<div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
								<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
								<p className="text-sm text-destructive">
									{verificationError}
								</p>
							</div>
						)}

						<Button
							onClick={
								verificationStep === "email"
									? handleSendCode
									: handleVerifyCode
							}
							disabled={isSendingCode || isVerifyingCode}
							className="w-full gap-2"
						>
							{isSendingCode || isVerifyingCode ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Mail className="h-4 w-4" />
							)}
							{verificationStep === "email"
								? "Send Code"
								: "Verify"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Main Content */}
			<main className="flex-1 overflow-hidden">
				{!templateLoaded ? (
					// ID Entry View
					<div className="h-full flex items-center justify-center p-6">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.1 }}
							className="w-full max-w-md"
						>
							<Card className="shadow-medium">
								<CardHeader className="text-center space-y-2">
									<CardTitle className="text-2xl">
										Get Your Certificate
									</CardTitle>
									<CardDescription>
										Enter the certificate ID provided by
										your event organizer
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-6">
									<div className="space-y-2">
										<label className="text-sm font-medium">
											Certificate ID
										</label>
										<div className="flex gap-2">
											<Input
												data-tour="certificate-id-input"
												value={certificateId}
												onChange={(e) => {
													setCertificateId(
														e.target.value,
													);
													setError(null);
												}}
												placeholder="Enter certificate ID..."
												className="font-mono"
												disabled={isLoading}
											/>
											<Button
												data-tour="retrieve-btn"
												onClick={() =>
													handleFetchTemplate()
												}
												disabled={
													isLoading ||
													!certificateId.trim()
												}
												className="flex-shrink-0"
											>
												{isLoading ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<Search className="w-4 h-4" />
												)}
											</Button>
										</div>
									</div>

									{error && (
										<motion.div
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
										>
											<AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
											<p className="text-sm text-destructive">
												{error}
											</p>
										</motion.div>
									)}

									<div className="text-center text-sm text-muted-foreground">
										<p>
											Don't have an ID? Contact your event
											organizer.
										</p>
									</div>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				) : isSharedLinkFlow ? (
					// Simplified Shared Link View - Only Certificate Preview
					<div className="h-full flex flex-col items-center justify-center p-6">
						<div className="w-full max-w-4xl">
							<CertificatePreview
								templateUrl={templateUrl}
								fields={
									fields.length > 0
										? fields.map((f) => ({
												...f,
												text:
													inputValues[f.id] !==
													undefined
														? inputValues[f.id]
														: f.required
															? f.text
															: f.text,
											}))
										: [
												{
													id: "preview",
													label: "Preview",
													text:
														participantName ||
														"Your Name",
													x: textPosition.x,
													y: textPosition.y,
													font: selectedFont,
													fontSize: fontSize,
													fontWeight: fontWeight,
													color: textColor,
													anchorMode: anchorMode,
												},
											]
								}
								selectedFieldId={fields[0]?.id || "preview"}
								onFieldSelect={() => {}}
								showPreview={true}
								previewRef={previewRef}
								imgRef={imgRef}
								isParticipant={true}
							/>

							{hasDownloaded && (
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									className="mt-6 flex flex-col items-center gap-4"
								>
									<p className="text-muted-foreground text-center">
										Your certificate has been downloaded!
									</p>
									<div className="flex gap-3">
										<Button
											variant="outline"
											onClick={() => {
												setShowNameInputDialog(true);
												setHasDownloaded(false);
											}}
										>
											Download Again
										</Button>
										<Button
											variant="ghost"
											onClick={() => {
												setIsSharedLinkFlow(false);
												setHasDownloaded(false);
											}}
										>
											Advanced Editor
										</Button>
									</div>
								</motion.div>
							)}
						</div>
					</div>
				) : (
					// Full Certificate Editor View
					<>
						<div className="h-full container mx-auto px-6 py-8">
							<div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
								{/* Center Preview */}
								<div className="flex flex-col items-center justify-center gap-2">
									<div className="flex-1 flex items-center justify-center w-full">
										<CertificatePreview
											templateUrl={templateUrl}
											fields={
												fields.length > 0
													? fields.map((f, i) =>
															i === 0
																? {
																		...f,
																		text:
																			participantName ||
																			"Your Name",
																	}
																: f,
														)
													: [
															{
																id: "preview",
																label: "Preview",
																text:
																	participantName ||
																	"Your Name",
																x: textPosition.x,
																y: textPosition.y,
																font: selectedFont,
																fontSize: fontSize,
																fontWeight:
																	fontWeight,
																color: textColor,
																anchorMode:
																	anchorMode,
															},
														]
											}
											selectedFieldId={
												fields[0]?.id || "preview"
											}
											onFieldSelect={() => {}}
											showPreview={true}
											previewRef={previewRef}
											imgRef={imgRef}
											isParticipant={false}
											onFieldMove={handleFieldMove}
										/>
									</div>
									<p className="text-center text-xs text-muted-foreground">
										Drag the text to reposition · arrow
										keys to nudge (hold Shift for bigger
										steps)
									</p>
									<div className="flex items-center gap-2">
										<Label
											htmlFor="anchor-mode"
											className="text-xs text-muted-foreground"
										>
											{anchorMode === "center"
												? "Center anchor"
												: "Left anchor"}
										</Label>
										<Switch
											id="anchor-mode"
											checked={anchorMode === "left"}
											onCheckedChange={(checked) =>
												setAnchorMode(
													checked ? "left" : "center",
												)
											}
										/>
									</div>
								</div>

								{/* Right Controls - Styling & Download */}
								<div className="h-full max-w-[264px] flex flex-col gap-4">
									<ParticipantControlPanel
										participantName={participantName}
										onParticipantNameChange={
											setParticipantName
										}
										selectedFont={selectedFont}
										onFontChange={setSelectedFont}
										fontSize={fontSize}
										onFontSizeChange={setFontSize}
										fontWeight={fontWeight}
										onFontWeightChange={setFontWeight}
										textColor={textColor}
										onTextColorChange={setTextColor}
										onDownload={handleDownload}
										onBack={() => {
											setTemplateLoaded(false);
											setTemplateUrl(null);
											setParticipantName("");
											setIsLocalDraft(false);
										}}
										hasName={!!participantName.trim()}
										nameLocked={isNameVerified}
									/>
									{isLocalDraft && (
										<Button
											onClick={handlePublish}
											className="w-full gap-2"
											variant="secondary"
										>
											<Share2 className="w-4 h-4" />
											Publish & Share
										</Button>
									)}
								</div>
							</div>
						</div>

						<Dialog
							open={showShareDialog}
							onOpenChange={setShowShareDialog}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										Certificate Published!
									</DialogTitle>
									<DialogDescription>
										Share this link with your participants
										to let them fill their details.
									</DialogDescription>
								</DialogHeader>
								<div className="flex items-center space-x-2">
									<div className="grid flex-1 gap-2">
										<Label
											htmlFor="link"
											className="sr-only"
										>
											Link
										</Label>
										<Input
											id="link"
											defaultValue={generatedLink}
											readOnly
										/>
									</div>
									<Button
										size="sm"
										className="px-3"
										onClick={() => {
											navigator.clipboard.writeText(
												generatedLink,
											);
											toast.success(
												"Copied to clipboard",
											);
										}}
									>
										<span className="sr-only">Copy</span>
										Copy
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					</>
				)}
			</main>
		</div>
	);
};

export default Participant;
