import ReactGA from "react-ga4";

const MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;

export const initGA = () => {
	if (!MEASUREMENT_ID) return;
	ReactGA.initialize(MEASUREMENT_ID);
};

export const logPageView = () => {
	if (!MEASUREMENT_ID) return;
	ReactGA.send({
		hitType: "pageview",
		page: window.location.pathname + window.location.search,
	});
};

export const logEvent = (category: string, action: string, label?: string) => {
	if (!MEASUREMENT_ID) return;
	ReactGA.event({ category, action, label });
};
