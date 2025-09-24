import { AdditionalContextParam } from '@/types';
import { MastraStorage } from '@mastra/core';
import { MastraMessageV2 } from '@mastra/core';

/**
 * Result type for the updateMessageMetadataForMonitoring function
 */
export interface UpdateMessagesForMonitoringResult {
	success: boolean;
	updatedCount: number;
	errors?: string[];
}

/**
 * Helper function to update message metadata with context data
 *
 * @param mastraStorage - The PostgresStore instance for database operations
 * @param threadId - The thread ID to update messages for
 * @param additionalContext - The additional context object containing metadata
 * @param metadataKeys - Array of keys to extract from additionalContext and add to message metadata
 * @returns Promise<UpdateMessagesForMonitoringResult> - Result of the update operation
 */
export async function updateMessageMetadataForMonitoring(
	mastraStorage: MastraStorage,
	threadId: string,
	additionalContext: AdditionalContextParam<any>,
	metadataKeys: string[]
): Promise<UpdateMessagesForMonitoringResult> {
	try {
		// Extract metadata values from additionalContext
		const metadataToAdd: Record<string, unknown> = {};

		metadataKeys.forEach((key) => {
			const contextValue = additionalContext?.[key];
			// Handle both direct values and data property structure
			const value = Array.isArray(contextValue)
				? contextValue.map((c) => c.data)
				: contextValue?.data !== undefined
				? contextValue.data
				: contextValue;
			if (value !== undefined && value !== null) {
				metadataToAdd[key] = value;
			}
		});

		// If no metadata to add, return early
		if (Object.keys(metadataToAdd).length === 0) {
			return {
				success: true,
				updatedCount: 0,
			};
		}

		// Get all messages in the thread
		const { messages } = await mastraStorage.getMessagesPaginated({
			threadId,
			format: 'v2',
		});

		if (!messages || messages.length === 0) {
			return {
				success: true,
				updatedCount: 0,
			};
		}

		const requiredKeys = Object.keys(metadataToAdd);

		// Filter messages that are missing any of the required metadata keys
		const messagesToUpdate = messages.filter((m) => {
			const typedMastraMessage = m as MastraMessageV2;
			return requiredKeys.some(
				(key) => typedMastraMessage.content?.metadata?.[key] === undefined
			);
		});

		// If no messages need updating, return early
		if (messagesToUpdate.length === 0) {
			return {
				success: true,
				updatedCount: 0,
			};
		}

		// Prepare updates for messages with missing metadata
		const updates = messagesToUpdate.map((m) => {
			const typedMastraMessage = m as MastraMessageV2;
			// Merge metadata: preserve existing values, add missing keys
			const existingMeta = typedMastraMessage.content?.metadata || {};
			const mergedMeta: Record<string, unknown> = { ...existingMeta };

			requiredKeys.forEach((key) => {
				if (mergedMeta[key] === undefined) {
					mergedMeta[key] = metadataToAdd[key];
				}
			});

			return {
				id: typedMastraMessage.id,
				content: {
					format: 2 as const,
					parts: typedMastraMessage.content?.parts || [],
					metadata: mergedMeta,
				},
			};
		});

		// Update messages in the database
		await mastraStorage.updateMessages({ messages: updates });

		return {
			success: true,
			updatedCount: updates.length,
		};
	} catch (error) {
		console.error('Error updating message metadata:', error);
		return {
			success: false,
			updatedCount: 0,
			errors: [
				error instanceof Error ? error.message : 'Unknown error occurred',
			],
		};
	}
}
