import { initGA, logPageView } from "@/lib/analytics";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const AnalyticsTracker = () => {
	const location = useLocation();

	useEffect(() => {
		initGA();
	}, []);

	useEffect(() => {
		logPageView();
	}, [location]);

	return null;
};

export default AnalyticsTracker;
