const GencMark = ({ className }: { className?: string }) => (
	<svg
		viewBox="0 0 48 48"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		className={className}
	>
		<path
			d="M17 26 L13 44 L20 39 L24 42 L21 26 Z"
			fill="currentColor"
			fillOpacity="0.35"
		/>
		<path
			d="M31 26 L35 44 L28 39 L24 42 L27 26 Z"
			fill="currentColor"
			fillOpacity="0.35"
		/>
		<circle cx="24" cy="19" r="15" fill="currentColor" />
		<path
			d="M30.5 13.8 A8 8 0 1 0 30.5 24.2"
			stroke="hsl(var(--background))"
			strokeWidth="3.4"
			strokeLinecap="round"
			fill="none"
		/>
	</svg>
);

export default GencMark;
