import { Database, Json } from '@/database.types';
import { validateOrCreateProductUser } from '@/store/configSlice';
import { getSupabaseClient, SupabaseConfig } from '@/utils/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Action } from '@/store/actionsSlice';

// Define the structure for a step response with completion time
type StoredAction = Omit<Action, 'onEnd'> & {
	completed_at: string | null;
};

type ActionConfig = Database['public']['Tables']['action_configs']['Row'];
type ActionLog = Database['public']['Tables']['action_logs']['Row'];

// Helper function to prepare action for storage (removes onEnd function)
const prepareActionForStorage = (
	action: Action,
	completedAt: string | null = null
): Json => {
	const { onEnd, ...actionWithoutOnEnd } = action; // eslint-disable-line @typescript-eslint/no-unused-vars
	return {
		...actionWithoutOnEnd,
		completed_at: completedAt,
	} as Json;
};

export const fetchActionFlows = async (
	productId: string,
	config?: SupabaseConfig
): Promise<{ actions: ActionConfig[] | null; error: Error | null }> => {
	const client = getSupabaseClient(config);

	try {
		const { data, error } = await client
			.from('action_configs')
			.select('*')
			.eq('product_id', productId)
			.eq('is_active', true)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error fetching action configs:', error);
			return { actions: null, error };
		}

		return { actions: data as ActionConfig[], error: null };
	} catch (err) {
		console.error('Error fetching action configs:', err);
		return { actions: null, error: err as Error };
	}
};

export const createActionLog = async (
	userId: string,
	productId: string,
	sessionId: string,
	actionConfigId?: string,
	actions?: Action[],
	config?: SupabaseConfig
): Promise<{ log: ActionLog | null; error: Error | null }> => {
	const client = getSupabaseClient(config);

	const { success, error: validationError } = await validateOrCreateProductUser(
		userId,
		productId
	);
	if (!success) {
		console.error(
			'Error validating or creating product user:',
			validationError
		);
		return { log: null, error: validationError };
	}

	let configId = actionConfigId;
	if (!configId) {
		const { actions: configActions, error: fetchError } =
			await fetchActionFlows(productId);
		if (fetchError) {
			return { log: null, error: fetchError };
		}
		configId = configActions?.[0]?.id;
		if (!configId) {
			return { log: null, error: new Error('No active action config found') };
		}
	}

	// Generate a new session ID if one isn't provided
	const newSessionId = sessionId || uuidv4();

	// Build step responses array from actions
	let stepResponses: Json[] | null = null;
	if (actions) {
		stepResponses = actions.map((action) => prepareActionForStorage(action));
	}

	const logData = {
		id: uuidv4(),
		onboarding_config_id: configId,
		product_user_id: userId,
		product_id: productId,
		session_id: newSessionId,
		started_at: new Date().toISOString(),
		step_responses: stepResponses,
	};

	try {
		const { data, error } = await client
			.from('action_logs')
			.insert(logData)
			.select()
			.single();

		if (error) {
			console.error('Error creating action log:', error);
			return { log: null, error };
		}

		return { log: data as ActionLog, error: null };
	} catch (err) {
		console.error('Error creating action log:', err);
		return { log: null, error: err as Error };
	}
};

export const updateActionLog = async (
	logId: string,
	updates: {
		action?: Action; // The full updated action
		completed?: boolean; // Whether to mark the entire log as completed
	},
	config?: SupabaseConfig
): Promise<{ log: ActionLog | null; error: Error | null }> => {
	const client = getSupabaseClient(config);

	try {
		// First get the current log to update its step_responses
		const { data: currentLog, error: fetchError } = await client
			.from('action_logs')
			.select('*')
			.eq('id', logId)
			.single();

		if (fetchError) {
			console.error('Error fetching current log:', fetchError);
			return { log: null, error: fetchError };
		}

		const updateData: {
			step_responses?: Json;
			completed_at?: string;
		} = {};

		// If we have an action, update it in the step_responses
		if (updates.action && currentLog.step_responses) {
			const stepResponses = currentLog.step_responses as Json[];
			const updatedResponses = stepResponses.map((response) => {
				const typedResponse = response as unknown as StoredAction;
				if (typedResponse.id === updates.action?.id && updates.action) {
					return prepareActionForStorage(
						updates.action,
						new Date().toISOString()
					);
				}
				return response;
			});
			updateData.step_responses = updatedResponses;
		}

		// If completed is true, mark the entire log as completed
		if (updates.completed) {
			updateData.completed_at = new Date().toISOString();
		}

		// If updateData is empty, return current log without making update
		if (Object.keys(updateData).length === 0) {
			return { log: currentLog as ActionLog, error: null };
		}

		const { data, error } = await client
			.from('action_logs')
			.update(updateData)
			.eq('id', logId)
			.select()
			.single();

		if (error) {
			console.error('Error updating action log:', error);
			return { log: null, error };
		}

		return { log: data as ActionLog, error: null };
	} catch (err) {
		console.error('Error updating action log:', err);
		return { log: null, error: err as Error };
	}
};
