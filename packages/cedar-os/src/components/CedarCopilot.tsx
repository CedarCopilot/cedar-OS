import {
	CedarCopilotClient,
	CedarCopilotProps,
} from '@/components/CedarCopilot.client';

// Server component wrapper so consumers can import CedarCopilot in Server Components
export function CedarCopilot(props: CedarCopilotProps) {
	return <CedarCopilotClient {...props} />;
}
