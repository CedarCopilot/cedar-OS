import { useCedarStore } from '@/store/CedarStore';
import { useEffect, useRef } from 'react';
import { z } from 'zod';
import type { ToolFunction } from './ToolsTypes';

export interface UseRegisterFrontendToolOptions<TArgs> {
	name: string;
	execute: ToolFunction<TArgs>;
	argsSchema: z.ZodSchema<TArgs>;
	description?: string;
	// Optional flag to disable auto-registration
	enabled?: boolean;
}

/**
 * Hook to register a frontend tool that can be called by the agent.
 * The tool is automatically registered when the component mounts and
 * unregistered when it unmounts.
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   useRegisterFrontendTool({
 *     name: 'showNotification',
 *     execute: ({ message, type }) => {
 *       toast[type](message);
 *     },
 *     argsSchema: z.object({
 *       message: z.string(),
 *       type: z.enum(['success', 'error', 'info']),
 *     }),
 *     description: 'Shows a notification to the user',
 *   });
 *
 *   return <div>Component with registered tool</div>;
 * };
 * ```
 */
export function useRegisterFrontendTool<TArgs>(
	options: UseRegisterFrontendToolOptions<TArgs>
) {
	const registerTool = useCedarStore((state) => state.registerTool);
	const unregisterTool = useCedarStore((state) => state.unregisterTool);

	// Use refs to track the current execute function to avoid re-registering on every render
	const executeRef = useRef(options.execute);
	const nameRef = useRef(options.name);

	// Update the execute ref when it changes
	useEffect(() => {
		executeRef.current = options.execute;
	}, [options.execute]);

	// Update the name ref when it changes
	useEffect(() => {
		nameRef.current = options.name;
	}, [options.name]);

	useEffect(() => {
		// Skip registration if disabled
		if (options.enabled === false) {
			return;
		}

		// Register the tool with a wrapper that always calls the latest execute function
		registerTool({
			name: options.name,
			execute: (args: TArgs) => executeRef.current(args),
			argsSchema: options.argsSchema,
			description: options.description,
		});

		// Cleanup: unregister the tool when the component unmounts
		return () => {
			unregisterTool(nameRef.current);
		};
	}, [
		options.name,
		options.argsSchema,
		options.description,
		options.enabled,
		registerTool,
		unregisterTool,
	]);

	// Return a function to manually unregister if needed
	return {
		unregister: () => unregisterTool(options.name),
	};
}
