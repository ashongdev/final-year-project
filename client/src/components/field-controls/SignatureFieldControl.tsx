import SignaturePad from "@/components/SignaturePad";
import { Button } from "@/components/ui/button";
import { TextField } from "@/types/TextField";

interface SignatureFieldControlProps {
	field: TextField;
	onFieldUpdate: (updates: Partial<TextField>) => void;
	isUploading: boolean;
	onCapture: (file: File | Blob) => void;
	onSelectLibrary: (signature: { url: string; name: string }) => void;
}

const SignatureFieldControl = ({
	field,
	onFieldUpdate,
	isUploading,
	onCapture,
	onSelectLibrary,
}: SignatureFieldControlProps) => (
	<div className="space-y-2">
		<label className="text-xs text-muted-foreground">Signature</label>
		{field.imageUrl ? (
			<div className="space-y-2">
				<div className="flex items-center justify-center rounded-md border border-border bg-muted/30 p-3">
					<img
						src={field.imageUrl}
						alt="Signature"
						className="max-h-16 object-contain"
					/>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-full"
					onClick={() => onFieldUpdate({ imageUrl: undefined })}
				>
					Replace Signature
				</Button>
			</div>
		) : (
			<SignaturePad
				penColor={field.color}
				isUploading={isUploading}
				onCapture={onCapture}
				onSelectLibrary={onSelectLibrary}
			/>
		)}
	</div>
);

export default SignatureFieldControl;
