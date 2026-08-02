import { useEffect, useState } from "react";

interface UseConfirmedNavigationOptions {
	/** Only intercepts navigation while true (e.g. guest + has unsaved work). */
	armed: boolean;
}

/**
 * Lets a caller intercept in-app navigation attempts and show a
 * confirmation UI before they actually happen. This app uses plain
 * <BrowserRouter>/<Routes>, not a data router, so React Router's
 * useBlocker isn't available — the intended usage instead is explicit:
 * pass `guardNavigation` to whatever triggers navigation (e.g. Header's
 * guardNavigation prop), which returns false and remembers the intended
 * destination instead of navigating, so the caller can show a dialog and
 * navigate for real (via confirmLeave) once the user actually confirms.
 *
 * Also guards hard exits (tab close/refresh/typed URL) via beforeunload —
 * that one shows the browser's own dialog, which can't be restyled with
 * custom buttons; a platform limitation, not a shortcut taken here.
 *
 * Deliberately doesn't cover the browser back/forward button, which would
 * need the data-router migration mentioned above.
 */
export const useConfirmedNavigation = ({ armed }: UseConfirmedNavigationOptions) => {
	const [pendingHref, setPendingHref] = useState<string | null>(null);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (!armed) return;
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [armed]);

	/** Returns true to allow navigation immediately, false to block it (and
	 * remember `to` as pending) — call sites should skip their own
	 * navigate()/Link default when this returns false. */
	const guardNavigation = (to: string): boolean => {
		if (!armed) return true;
		setPendingHref(to);
		return false;
	};

	return {
		pendingHref,
		guardNavigation,
		cancel: () => setPendingHref(null),
		/** A full page navigation (not React Router's navigate()) — simplest
		 * way to leave that doesn't need this hook to know about every
		 * possible link's own `state`, and naturally bypasses SPA routing
		 * entirely so there's no risk of re-triggering the guard. */
		confirmLeave: () => {
			if (pendingHref) window.location.href = pendingHref;
		},
	};
};
