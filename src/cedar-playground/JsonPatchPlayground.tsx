'use client';

import React, { useMemo } from 'react';
import * as jsonpatch from 'fast-json-patch';

// Types for our objects
interface ItemsState {
	items: (number | string)[];
}

// Required consts
export const ObjectA: ItemsState = { items: [{ id: 1 }, { id: 2 }] } as const;
export const ObjectB: ItemsState = {
	items: [{ id: 'a' }, { id: 1 }, { id: 'b' }, { id: 2 }, { id: 'c' }],
} as const;

// Aliases matching requested snippet naming
const stateWithRequiredStructures: ItemsState = ObjectA;
const newState: ItemsState = ObjectB;

function JsonBlock({ value }: { value: unknown }) {
	return (
		<pre className='text-xs p-3 bg-gray-50 dark:bg-gray-800 border rounded overflow-x-auto'>
			{JSON.stringify(value, null, 2)}
		</pre>
	);
}

export default function JsonPatchPlayground() {
	const { patches, applied } = useMemo(() => {
		const diff = jsonpatch.compare(stateWithRequiredStructures, newState);
		const cloned: ItemsState = JSON.parse(
			JSON.stringify(stateWithRequiredStructures)
		);
		const result = jsonpatch.applyPatch(cloned, diff as jsonpatch.Operation[])
			.newDocument as ItemsState;
		return { patches: diff, applied: result };
	}, []);

	return (
		<div className='p-6 rounded-lg border border-gray-200 bg-white shadow-sm dark:bg-gray-900 dark:border-gray-800'>
			<h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-white'>
				JSON Patch Playground
			</h3>
			<p className='text-sm mb-4 text-gray-600 dark:text-gray-300'>
				Demonstrates jsonpatch.compare(stateWithRequiredStructures, newState)
				using the official JSON-Patch implementation.
			</p>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
				<div>
					<div className='text-sm font-medium mb-2 text-gray-800 dark:text-gray-200'>
						ObjectA
					</div>
					<JsonBlock value={ObjectA} />
				</div>
				<div>
					<div className='text-sm font-medium mb-2 text-gray-800 dark:text-gray-200'>
						ObjectB
					</div>
					<JsonBlock value={ObjectB} />
				</div>
			</div>

			<div className='mb-4'>
				<div className='text-sm font-medium mb-2 text-gray-800 dark:text-gray-200'>
					jsonpatch.compare(stateWithRequiredStructures, newState) → patches
				</div>
				<JsonBlock value={patches} />
			</div>

			<div>
				<div className='text-sm font-medium mb-2 text-gray-800 dark:text-gray-200'>
					applyPatch(ObjectA, patches) → result
				</div>
				<JsonBlock value={applied} />
			</div>
		</div>
	);
}
