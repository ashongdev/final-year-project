import CertificateEditor from "@/components/CertificateEditor";
import { indexPageTourSteps, TOUR_STORAGE_KEYS } from "@/config/tourSteps";
import { useLocation } from "react-router-dom";
import type { Recipient, TextField } from "@/types/TextField";

const Editor = () => {
	const location = useLocation();
	const state = location.state as {
		fields?: TextField[];
		templateFile?: File;
		templateUrl?: string;
		recipients?: Recipient[];
		templateUseMode?: "testing" | "actual";
		uploadedPublicId?: string | null;
	} | null;

	return (
		<CertificateEditor
			mode="simple"
			tourSteps={indexPageTourSteps}
			tourStorageKey={TOUR_STORAGE_KEYS.index}
			initialFields={state?.fields}
			initialTemplateFile={state?.templateFile ?? null}
			initialTemplateUrl={state?.templateUrl ?? null}
			initialRecipients={state?.recipients ?? []}
			templateUseMode={state?.templateUseMode}
			initialUploadedPublicId={state?.uploadedPublicId ?? null}
		/>
	);
};

export default Editor;
