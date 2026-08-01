import { useEffect } from "react";

interface UseClearSelectionOnOutsideParams {
	enabled: boolean;
	selectors: string[];
	onClear: () => void;
}

const useClearSelectionOnOutside = ({
	enabled,
	selectors,
	onClear,
}: UseClearSelectionOnOutsideParams) => {
	useEffect(() => {
		if (!enabled) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as HTMLElement | null;
			if (!target) return;

			const clickedInsideTrackedRegion = selectors.some((selector) =>
				target.closest(selector),
			);

			if (!clickedInsideTrackedRegion) {
				onClear();
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
		};
	}, [enabled, selectors, onClear]);
};

export default useClearSelectionOnOutside;
