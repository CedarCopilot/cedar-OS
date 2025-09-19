import { addDiffToMapObj } from '../../../src/store/diffHistoryStateSlice/useRegisterDiffState';

// Test types with optional diff property
interface TestItem extends Record<string, unknown> {
	diff?: 'added' | 'changed';
}

interface SimpleTestItem extends TestItem {
	id: string;
	name: string;
}

interface KeyValueTestItem extends TestItem {
	key: string;
	value: number;
}

interface NestedTestItem extends TestItem {
	id: string;
	data?: {
		title: string;
		status?: string;
		content?: string;
		diff?: 'added' | 'changed';
	};
	position?: { x: number; y: number };
	positionAbsolute?: { x: number; y: number };
	width?: number;
	height?: number;
}

interface DeepNestedTestItem extends TestItem {
	id: string;
	meta?: {
		info?: {
			status: string;
			diff?: 'added' | 'changed';
		};
	};
}

interface NumberKeyTestItem extends TestItem {
	id: number;
	value: string;
}

interface MetadataTestItem extends TestItem {
	id: string;
	name: string;
	metadata: { created: string };
}

describe('addDiffToMapObj', () => {
	it('should mark added items at root level', () => {
		const oldMap = new Map<string, SimpleTestItem>([
			['1', { id: '1', name: 'Item 1' }],
			['2', { id: '2', name: 'Item 2' }],
		]);

		const newMap = new Map<string, SimpleTestItem>([
			['1', { id: '1', name: 'Item 1' }],
			['2', { id: '2', name: 'Item 2' }],
			['3', { id: '3', name: 'Item 3' }],
		]);

		const result = addDiffToMapObj(oldMap, newMap);

		expect(result.get('1')?.diff).toBeUndefined();
		expect(result.get('2')?.diff).toBeUndefined();
		expect(result.get('3')?.diff).toBe('added');
	});

	it('should mark changed items at root level', () => {
		const oldMap = new Map<string, SimpleTestItem>([
			['1', { id: '1', name: 'Item 1' }],
			['2', { id: '2', name: 'Item 2' }],
		]);

		const newMap = new Map<string, SimpleTestItem>([
			['1', { id: '1', name: 'Item 1 Updated' }],
			['2', { id: '2', name: 'Item 2' }],
		]);

		const result = addDiffToMapObj(oldMap, newMap);

		expect(result.get('1')?.diff).toBe('changed');
		expect(result.get('2')?.diff).toBeUndefined();
	});

	it('should handle mixed changes and additions', () => {
		const oldMap = new Map<string, KeyValueTestItem>([
			['a', { key: 'a', value: 1 }],
			['b', { key: 'b', value: 2 }],
		]);

		const newMap = new Map<string, KeyValueTestItem>([
			['a', { key: 'a', value: 1 }],
			['b', { key: 'b', value: 3 }],
			['c', { key: 'c', value: 4 }],
		]);

		const result = addDiffToMapObj(oldMap, newMap);

		expect(result.get('a')?.diff).toBeUndefined();
		expect(result.get('b')?.diff).toBe('changed');
		expect(result.get('c')?.diff).toBe('added');
	});

	it('should add diff markers at nested path', () => {
		const oldMap = new Map<string, NestedTestItem>([
			['1', { id: '1', data: { title: 'Node 1', status: 'active' } }],
			['2', { id: '2', data: { title: 'Node 2', status: 'active' } }],
		]);

		const newMap = new Map<string, NestedTestItem>([
			['1', { id: '1', data: { title: 'Node 1', status: 'active' } }],
			['2', { id: '2', data: { title: 'Node 2 Updated', status: 'active' } }],
			['3', { id: '3', data: { title: 'Node 3', status: 'active' } }],
		]);

		const result = addDiffToMapObj(oldMap, newMap, '/data');

		expect(result.get('1')?.data?.diff).toBeUndefined();
		expect(result.get('2')?.data?.diff).toBe('changed');
		expect(result.get('3')?.data?.diff).toBe('added');
	});

	it('should add diff markers at deeply nested path', () => {
		const oldMap = new Map<string, DeepNestedTestItem>([
			['1', { id: '1', meta: { info: { status: 'active' } } }],
		]);

		const newMap = new Map<string, DeepNestedTestItem>([
			['1', { id: '1', meta: { info: { status: 'completed' } } }],
			['2', { id: '2', meta: { info: { status: 'pending' } } }],
		]);

		const result = addDiffToMapObj(oldMap, newMap, '/meta/info');

		expect(result.get('1')?.meta?.info?.diff).toBe('changed');
		expect(result.get('2')?.meta?.info?.diff).toBe('added');
	});

	it('should handle empty old map', () => {
		const oldMap = new Map<string, SimpleTestItem>();
		const newMap = new Map<string, SimpleTestItem>([
			['1', { id: '1', name: 'Item 1' }],
			['2', { id: '2', name: 'Item 2' }],
		]);

		const result = addDiffToMapObj(oldMap, newMap);

		expect(result.get('1')?.diff).toBe('added');
		expect(result.get('2')?.diff).toBe('added');
	});

	it('should handle empty new map', () => {
		const oldMap = new Map<string, SimpleTestItem>([
			['1', { id: '1', name: 'Item 1' }],
			['2', { id: '2', name: 'Item 2' }],
		]);
		const newMap = new Map<string, SimpleTestItem>();

		const result = addDiffToMapObj(oldMap, newMap);

		expect(result.size).toBe(0);
	});

	it('should handle identical maps', () => {
		const oldMap = new Map<string, SimpleTestItem>([
			['1', { id: '1', name: 'Item 1' }],
			['2', { id: '2', name: 'Item 2' }],
		]);

		const newMap = new Map<string, SimpleTestItem>([
			['1', { id: '1', name: 'Item 1' }],
			['2', { id: '2', name: 'Item 2' }],
		]);

		const result = addDiffToMapObj(oldMap, newMap);

		expect(result.get('1')?.diff).toBeUndefined();
		expect(result.get('2')?.diff).toBeUndefined();
	});

	describe('with diffChecker - ignore fields', () => {
		it('should ignore specified fields when detecting changes', () => {
			const oldMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 0, y: 0 },
						positionAbsolute: { x: 100, y: 200 },
						data: {
							title: 'Node 1',
							content: 'unchanged',
						},
					},
				],
			]);

			const newMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 0, y: 0 },
						positionAbsolute: { x: 150, y: 250 }, // Changed but should be ignored
						data: {
							title: 'Node 1',
							content: 'unchanged',
						},
					},
				],
			]);

			const diffChecker = {
				type: 'ignore' as const,
				fields: ['/positionAbsolute'],
			};

			const result = addDiffToMapObj(oldMap, newMap, '/data', diffChecker);

			expect(result.get('1')?.data?.diff).toBeUndefined();
		});

		it('should detect changes when non-ignored fields change', () => {
			const oldMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 10, y: 10 },
						positionAbsolute: { x: 100, y: 200 },
						data: {
							title: 'Node 1',
							content: 'unchanged',
						},
					},
				],
			]);

			const newMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 20, y: 20 }, // This should be detected
						positionAbsolute: { x: 150, y: 250 }, // This should be ignored
						data: {
							title: 'Node 1',
							content: 'unchanged',
						},
					},
				],
			]);

			const diffChecker = {
				type: 'ignore' as const,
				fields: ['/positionAbsolute'],
			};

			const result = addDiffToMapObj(oldMap, newMap, '/data', diffChecker);

			expect(result.get('1')?.data?.diff).toBe('changed');
		});

		it('should ignore multiple fields', () => {
			const oldMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 100, y: 100 },
						positionAbsolute: { x: 100, y: 200 },
						width: 200,
						height: 100,
						data: {
							title: 'Node 1',
						},
					},
				],
			]);

			const newMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 150, y: 150 }, // Changed but ignored
						positionAbsolute: { x: 150, y: 250 }, // Changed but ignored
						width: 250, // Changed but ignored
						height: 150, // Changed but ignored
						data: {
							title: 'Node 1',
						},
					},
				],
			]);

			const diffChecker = {
				type: 'ignore' as const,
				fields: ['/position', '/positionAbsolute', '/width', '/height'],
			};

			const result = addDiffToMapObj(oldMap, newMap, '/data', diffChecker);

			expect(result.get('1')?.data?.diff).toBeUndefined();
		});
	});

	describe('with diffChecker - listen fields', () => {
		it('should only detect changes in specified listen fields', () => {
			const oldMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 10, y: 10 },
						positionAbsolute: { x: 100, y: 200 },
						data: {
							title: 'Node 1',
							content: 'unchanged',
						},
					},
				],
			]);

			const newMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 20, y: 20 }, // Changed but not in listen fields
						positionAbsolute: { x: 150, y: 250 }, // Changed and in listen fields
						data: {
							title: 'Node 1',
							content: 'unchanged',
						},
					},
				],
			]);

			const diffChecker = {
				type: 'listen' as const,
				fields: ['/positionAbsolute'],
			};

			const result = addDiffToMapObj(oldMap, newMap, '/data', diffChecker);

			expect(result.get('1')?.data?.diff).toBe('changed');
		});

		it('should not detect changes when listen fields are unchanged', () => {
			const oldMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 10, y: 10 },
						positionAbsolute: { x: 100, y: 200 },
						data: {
							title: 'Node 1',
							content: 'unchanged',
						},
					},
				],
			]);

			const newMap = new Map<string, NestedTestItem>([
				[
					'1',
					{
						id: '1',
						position: { x: 20, y: 20 }, // Changed but not in listen fields
						positionAbsolute: { x: 100, y: 200 }, // Unchanged and in listen fields
						data: {
							title: 'Node 1 Updated', // Changed but not in listen fields
							content: 'also changed', // Changed but not in listen fields
						},
					},
				],
			]);

			const diffChecker = {
				type: 'listen' as const,
				fields: ['/positionAbsolute'],
			};

			const result = addDiffToMapObj(oldMap, newMap, '/data', diffChecker);

			expect(result.get('1')?.data?.diff).toBeUndefined();
		});
	});

	it('should handle diffChecker fields without leading slash', () => {
		const oldMap = new Map<string, NestedTestItem>([
			[
				'1',
				{
					id: '1',
					positionAbsolute: { x: 100, y: 200 },
					data: {
						title: 'Node 1',
					},
				},
			],
		]);

		const newMap = new Map<string, NestedTestItem>([
			[
				'1',
				{
					id: '1',
					positionAbsolute: { x: 150, y: 250 },
					data: {
						title: 'Node 1',
					},
				},
			],
		]);

		// Test with field without leading slash
		const diffChecker = {
			type: 'ignore' as const,
			fields: ['positionAbsolute'], // No leading slash
		};

		const result = addDiffToMapObj(oldMap, newMap, '/data', diffChecker);

		expect(result.get('1')?.data?.diff).toBeUndefined();
	});

	it('should preserve original values when no changes detected', () => {
		const originalItem: MetadataTestItem = {
			id: '1',
			name: 'Item 1',
			metadata: { created: '2023-01-01' },
		};
		const oldMap = new Map<string, MetadataTestItem>([['1', originalItem]]);
		const newMap = new Map<string, MetadataTestItem>([
			['1', { ...originalItem }],
		]);

		const result = addDiffToMapObj(oldMap, newMap);

		expect(result.get('1')).toEqual(originalItem);
		expect(result.get('1')?.diff).toBeUndefined();
	});

	it('should work with different key types', () => {
		const oldMap = new Map<number, NumberKeyTestItem>([
			[1, { id: 1, value: 'first' }],
			[2, { id: 2, value: 'second' }],
		]);

		const newMap = new Map<number, NumberKeyTestItem>([
			[1, { id: 1, value: 'first updated' }],
			[2, { id: 2, value: 'second' }],
			[3, { id: 3, value: 'third' }],
		]);

		const result = addDiffToMapObj(oldMap, newMap);

		expect(result.get(1)?.diff).toBe('changed');
		expect(result.get(2)?.diff).toBeUndefined();
		expect(result.get(3)?.diff).toBe('added');
	});
});
