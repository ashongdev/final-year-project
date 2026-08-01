import CertificateEditor from "@/components/CertificateEditor";
import { advancedPageTourSteps, TOUR_STORAGE_KEYS } from "@/config/tourSteps";
import { useLocation } from "react-router-dom";
import type { TextField } from "@/types/TextField";

const Advanced = () => {
	const location = useLocation();
	const state = location.state as {
		fields?: TextField[];
		templateFile?: File;
		templateUrl?: string;
	} | null;

	return (
		<CertificateEditor
			mode="advanced"
			tourSteps={advancedPageTourSteps}
			tourStorageKey={TOUR_STORAGE_KEYS.advanced}
			initialFields={state?.fields}
			initialTemplateFile={state?.templateFile ?? null}
			initialTemplateUrl={state?.templateUrl ?? null}
		/>
	);
};

export default Advanced;
