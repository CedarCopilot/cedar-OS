/* eslint-disable @typescript-eslint/no-explicit-any */
import { sanitizeJson, desanitizeJson } from '../../src/utils/sanitizeJson';

describe('desanitizeJson', () => {
	describe('Basic functionality', () => {
		it('should return primitives as-is', () => {
			expect(desanitizeJson('hello')).toBe('hello');
			expect(desanitizeJson(42)).toBe(42);
			expect(desanitizeJson(true)).toBe(true);
			expect(desanitizeJson(null)).toBe(null);
			expect(desanitizeJson(undefined)).toBe(undefined);
		});

		it('should handle simple objects without circular references', () => {
			const obj = { a: 1, b: 'test', c: { d: true } };
			const sanitized = sanitizeJson(obj);
			const desanitized = desanitizeJson(sanitized);
			expect(desanitized).toEqual(obj);
		});

		it('should handle arrays without circular references', () => {
			const arr = [1, 'test', { a: 2 }, [3, 4]];
			const sanitized = sanitizeJson(arr);
			const desanitized = desanitizeJson(sanitized);
			expect(desanitized).toEqual(arr);
		});
	});

	describe('Circular reference reconstruction', () => {
		it('should reconstruct self-referencing objects', () => {
			const original: any = { name: 'test' };
			original.self = original;

			const sanitized = sanitizeJson(original);
			expect(sanitized).toEqual({
				name: 'test',
				self: '[Circular: $]',
			});

			const desanitized: any = desanitizeJson(sanitized);
			expect(desanitized.name).toBe('test');
			expect(desanitized.self).toBe(desanitized); // Circular reference restored
		});

		it('should reconstruct nested circular references', () => {
			const original: any = {
				a: {
					b: {
						c: 'deep',
					},
				},
			};
			original.a.b.backToRoot = original;
			original.a.backToA = original.a;

			const sanitized = sanitizeJson(original);
			const desanitized: any = desanitizeJson(sanitized);

			expect(desanitized.a.b.c).toBe('deep');
			expect(desanitized.a.b.backToRoot).toBe(desanitized);
			expect(desanitized.a.backToA).toBe(desanitized.a);
		});

		it('should handle circular references in arrays', () => {
			const original: any = [1, 2, 3];
			original.push(original);

			const sanitized = sanitizeJson(original);
			expect(sanitized).toEqual([1, 2, 3, '[Circular: $]']);

			const desanitized: any = desanitizeJson(sanitized);
			expect(desanitized.length).toBe(4);
			expect(desanitized[3]).toBe(desanitized);
		});

		it('should handle complex circular structures', () => {
			const original: any = {
				id: 1,
				children: [
					{ id: 2, parent: null },
					{ id: 3, parent: null },
				],
			};
			original.children[0].parent = original;
			original.children[1].parent = original;
			original.children[0].sibling = original.children[1];
			original.children[1].sibling = original.children[0];

			const sanitized = sanitizeJson(original);
			const desanitized: any = desanitizeJson(sanitized);

			expect(desanitized.children[0].parent).toBe(desanitized);
			expect(desanitized.children[1].parent).toBe(desanitized);
			expect(desanitized.children[0].sibling).toBe(desanitized.children[1]);
			expect(desanitized.children[1].sibling).toBe(desanitized.children[0]);
		});
	});

	describe('Path resolution', () => {
		it('should handle dot notation paths', () => {
			const original: any = {
				level1: {
					level2: {
						level3: 'value',
					},
				},
			};
			original.level1.level2.backToLevel1 = original.level1;

			const sanitized = sanitizeJson(original);
			const desanitized: any = desanitizeJson(sanitized);

			expect(desanitized.level1.level2.backToLevel1).toBe(desanitized.level1);
		});

		it('should handle bracket notation with array indices', () => {
			const original: any = {
				items: [{ name: 'first' }, { name: 'second' }, { name: 'third' }],
			};
			original.items[1].backToArray = original.items;
			original.items[2].backToFirst = original.items[0];

			const sanitized = sanitizeJson(original);
			const desanitized: any = desanitizeJson(sanitized);

			expect(desanitized.items[1].backToArray).toBe(desanitized.items);
			expect(desanitized.items[2].backToFirst).toBe(desanitized.items[0]);
		});

		it('should handle bracket notation with special characters in keys', () => {
			const original: any = {
				'special-key': { value: 1 },
				'key.with.dots': { value: 2 },
				'key"with"quotes': { value: 3 },
			};
			original['special-key'].back = original;
			original['key.with.dots'].back = original;
			original['key"with"quotes'].back = original;

			const sanitized = sanitizeJson(original);
			const desanitized: any = desanitizeJson(sanitized);

			expect(desanitized['special-key'].back).toBe(desanitized);
			expect(desanitized['key.with.dots'].back).toBe(desanitized);
			expect(desanitized['key"with"quotes'].back).toBe(desanitized);
		});
	});

	describe('Special placeholders', () => {
		it('should preserve function placeholders', () => {
			const sanitized = {
				fn: '[Function]',
				nested: {
					method: '[Function]',
				},
			};
			const desanitized = desanitizeJson(sanitized);
			expect(desanitized).toEqual(sanitized);
		});

		it('should preserve other special placeholders', () => {
			const sanitized = {
				react: '[React Component]',
				dom: '[DOM Element]',
				map: '[Map]',
				set: '[Set]',
			};
			const desanitized = desanitizeJson(sanitized);
			expect(desanitized).toEqual(sanitized);
		});
	});

	describe('Round-trip testing', () => {
		it('should handle a complete round-trip with circular references', () => {
			const original: any = {
				name: 'root',
				data: [1, 2, 3],
				nested: {
					value: 'test',
					array: [4, 5, 6],
				},
			};
			// Add various circular references
			original.self = original;
			original.nested.parent = original;
			original.data.push(original.nested);
			original.nested.array.push(original.data);

			// Sanitize
			const sanitized = sanitizeJson(original);

			// Verify sanitization worked
			expect(typeof sanitized).toBe('object');
			expect(JSON.stringify(sanitized)).toBeDefined(); // Should be JSON-serializable

			// Desanitize
			const desanitized: any = desanitizeJson(sanitized);

			// Verify structure
			expect(desanitized.name).toBe('root');
			expect(desanitized.data[0]).toBe(1);
			expect(desanitized.nested.value).toBe('test');

			// Verify circular references restored
			expect(desanitized.self).toBe(desanitized);
			expect(desanitized.nested.parent).toBe(desanitized);
			expect(desanitized.data[3]).toBe(desanitized.nested);
			expect(desanitized.nested.array[3]).toBe(desanitized.data);
		});

		it('should handle the Tableau dashboard example', () => {
			const tableau: any = {
				_eventListenerManagers: {},
				_sheetImpl: {
					_sheetInfoImpl: {
						_name: 'Overview (LOCAL)',
					},
				},
			};
			// Add circular reference
			tableau._dashboardImpl = tableau._sheetImpl;
			tableau._sheetImpl._parentDashboard = tableau._sheetImpl;

			const sanitized = sanitizeJson(tableau);
			const desanitized: any = desanitizeJson(sanitized);

			expect(desanitized._sheetImpl._sheetInfoImpl._name).toBe(
				'Overview (LOCAL)'
			);
			expect(desanitized._dashboardImpl).toBe(desanitized._sheetImpl);
			expect(desanitized._sheetImpl._parentDashboard).toBe(
				desanitized._sheetImpl
			);
		});
	});

	describe('Edge cases', () => {
		it('should handle empty objects and arrays', () => {
			expect(desanitizeJson({})).toEqual({});
			expect(desanitizeJson([])).toEqual([]);
		});

		it('should handle deeply nested structures', () => {
			const deep: any = { a: { b: { c: { d: { e: 'value' } } } } };
			deep.a.b.c.d.backToRoot = deep;

			const sanitized = sanitizeJson(deep);
			const desanitized: any = desanitizeJson(sanitized);

			expect(desanitized.a.b.c.d.e).toBe('value');
			expect(desanitized.a.b.c.d.backToRoot).toBe(desanitized);
		});

		it('should handle mixed array and object circular references', () => {
			const mixed: any = {
				arr: [{ id: 1 }, { id: 2 }],
			};
			mixed.arr[0].parent = mixed;
			mixed.arr[1].sibling = mixed.arr[0];
			mixed.backToSecond = mixed.arr[1];

			const sanitized = sanitizeJson(mixed);
			const desanitized: any = desanitizeJson(sanitized);

			expect(desanitized.arr[0].parent).toBe(desanitized);
			expect(desanitized.arr[1].sibling).toBe(desanitized.arr[0]);
			expect(desanitized.backToSecond).toBe(desanitized.arr[1]);
		});
	});
});
