import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { type PendingSessionInput, savePendingSession } from "@/lib/pendingSession";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface UnsavedProgressDialogProps {
	open: boolean;
	onCancel: () => void;
	onLeave: () => void;
	/** The editor's current state, stashed if the user picks Sign In —
	 * see pendingSession.ts. */
	sessionState: PendingSessionInput;
}

/**
 * Shown when a guest (not signed in, so nothing they've done can be saved)
 * tries to leave the editor with a template loaded. Styled like the
 * existing delete-confirmation pattern in TrashPage.tsx. Three ways out:
 * stay (Cancel), sign in first (preserves the session, see
 * pendingSession.ts + GoogleCallback.tsx), or leave and lose it.
 */
const UnsavedProgressDialog = ({
	open,
	onCancel,
	onLeave,
	sessionState,
}: UnsavedProgressDialogProps) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [isPreparingSignIn, setIsPreparingSignIn] = useState(false);

	const handleSignIn = async () => {
		setIsPreparingSignIn(true);
		try {
			await savePendingSession(sessionState);
		} finally {
			setIsPreparingSignIn(false);
		}
		// ProtectedRoute already sets this same `from` state shape on its own
		// sign-in link — Login.tsx reads it generically for any protected
		// route, not just this one.
		navigate("/login", { state: { from: location } });
	};

	return (
		<AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="font-playfair text-xl italic">
						Leave without saving?
					</AlertDialogTitle>
					<AlertDialogDescription>
						You're not signed in, so this template and your edits
						won't be saved once you leave. Sign in first to keep
						this and pick up right where you left off.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
					<Button
						variant="outline"
						className="gap-2"
						onClick={handleSignIn}
						disabled={isPreparingSignIn}
					>
						<LogIn className="h-4 w-4" />
						Sign In
					</Button>
					<AlertDialogAction
						onClick={onLeave}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						Leave
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default UnsavedProgressDialog;
