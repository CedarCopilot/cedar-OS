/* eslint-disable @typescript-eslint/no-explicit-any */
import { sanitizeJson } from '../../src/utils/sanitizeJson';
import React from 'react';

describe('sanitizeJson', () => {
	describe('Primitive values', () => {
		it('should return null as-is', () => {
			expect(sanitizeJson(null)).toBe(null);
		});

		it('should return undefined as-is', () => {
			expect(sanitizeJson(undefined)).toBe(undefined);
		});

		it('should return strings as-is', () => {
			expect(sanitizeJson('hello')).toBe('hello');
			expect(sanitizeJson('')).toBe('');
		});

		it('should return numbers as-is', () => {
			expect(sanitizeJson(42)).toBe(42);
			expect(sanitizeJson(0)).toBe(0);
			expect(sanitizeJson(-1)).toBe(-1);
			expect(sanitizeJson(3.14)).toBe(3.14);
			expect(sanitizeJson(NaN)).toBe(NaN);
			expect(sanitizeJson(Infinity)).toBe(Infinity);
		});

		it('should return booleans as-is', () => {
			expect(sanitizeJson(true)).toBe(true);
			expect(sanitizeJson(false)).toBe(false);
		});
	});

	describe('Arrays', () => {
		it('should handle empty arrays', () => {
			expect(sanitizeJson([])).toEqual([]);
		});

		it('should handle arrays with primitives', () => {
			expect(sanitizeJson([1, 'two', true, null])).toEqual([
				1,
				'two',
				true,
				null,
			]);
		});

		it('should handle nested arrays', () => {
			expect(
				sanitizeJson([
					[1, 2],
					[3, 4],
				])
			).toEqual([
				[1, 2],
				[3, 4],
			]);
		});

		it('should handle arrays with objects', () => {
			const input = [
				{ id: 1, name: 'Item 1' },
				{ id: 2, name: 'Item 2' },
			];
			const expected = [
				{ id: 1, name: 'Item 1' },
				{ id: 2, name: 'Item 2' },
			];
			expect(sanitizeJson(input)).toEqual(expected);
		});

		it('should handle arrays with functions', () => {
			const input = [1, () => {}, 'test'];
			const expected = [1, '[Function]', 'test'];
			expect(sanitizeJson(input)).toEqual(expected);
		});
	});

	describe('Objects', () => {
		it('should handle empty objects', () => {
			expect(sanitizeJson({})).toEqual({});
		});

		it('should handle simple objects', () => {
			const input = { name: 'John', age: 30, active: true };
			expect(sanitizeJson(input)).toEqual(input);
		});

		it('should handle nested objects', () => {
			const input = {
				user: {
					name: 'John',
					address: {
						city: 'New York',
						zip: '10001',
					},
				},
			};
			expect(sanitizeJson(input)).toEqual(input);
		});

		it('should replace functions with [Function]', () => {
			const input = {
				name: 'Test',
				onClick: () => console.log('clicked'),
				onHover: function () {
					return true;
				},
			};
			const expected = {
				name: 'Test',
				onClick: '[Function]',
				onHover: '[Function]',
			};
			expect(sanitizeJson(input)).toEqual(expected);
		});
	});

	describe('Circular references', () => {
		it('should handle simple circular reference', () => {
			const obj: any = { name: 'Test' };
			obj.self = obj;

			const result = sanitizeJson(obj) as any;
			expect(result.name).toBe('Test');
			expect(result.self).toBe('[Circular: $]');
		});

		it('should handle nested circular references', () => {
			const parent: any = { name: 'Parent' };
			const child: any = { name: 'Child' };
			parent.child = child;
			child.parent = parent;

			const result = sanitizeJson(parent) as any;
			expect(result.name).toBe('Parent');
			expect(result.child.name).toBe('Child');
			expect(result.child.parent).toBe('[Circular: $]');
		});

		it('should handle complex circular structure like Tableau dashboard', () => {
			const dashboard: any = {
				_sheetImpl: {
					_name: 'Dashboard',
					_worksheetsImpl: [],
				},
			};
			const worksheet = {
				_name: 'Worksheet',
				_parentDashboardImpl: dashboard,
			};
			dashboard._sheetImpl._worksheetsImpl.push(worksheet);

			const result = sanitizeJson(dashboard) as any;
			expect(result._sheetImpl._name).toBe('Dashboard');
			expect(result._sheetImpl._worksheetsImpl[0]._name).toBe('Worksheet');
			expect(result._sheetImpl._worksheetsImpl[0]._parentDashboardImpl).toBe(
				'[Circular: $]'
			);
		});

		it('should handle multiple circular references in same object', () => {
			const obj: any = { id: 1 };
			const ref1: any = { name: 'Ref1' };
			const ref2: any = { name: 'Ref2' };

			ref1.back = obj;
			ref2.back = obj;
			obj.ref1 = ref1;
			obj.ref2 = ref2;

			const result = sanitizeJson(obj) as any;
			expect(result.id).toBe(1);
			expect(result.ref1.name).toBe('Ref1');
			expect(result.ref1.back).toBe('[Circular: $]');
			expect(result.ref2.name).toBe('Ref2');
			expect(result.ref2.back).toBe('[Circular: $]');
		});

		it('should handle same object in different branches as circular reference', () => {
			const shared = { value: 'shared' };
			const obj = {
				branch1: { data: shared },
				branch2: { data: shared },
			};

			const result = sanitizeJson(obj) as any;
			expect(result.branch1.data.value).toBe('shared');
			// Second reference to same object is treated as circular
			expect(result.branch2.data).toBe('[Circular: $.branch1.data]');
		});
	});

	describe('React elements', () => {
		it('should replace React elements with [React Component]', () => {
			const element = React.createElement('div', { key: 'test' }, 'Hello');
			const input = {
				component: element,
				text: 'Normal text',
			};

			const result = sanitizeJson(input) as any;
			expect(result.component).toBe('[React Component]');
			expect(result.text).toBe('Normal text');
		});
	});

	describe('DOM elements', () => {
		it('should replace DOM elements with [DOM Element]', () => {
			// Mock DOM element
			const mockElement = document.createElement('div');
			const input = {
				element: mockElement,
				text: 'Normal text',
			};

			const result = sanitizeJson(input) as any;
			expect(result.element).toBe('[DOM Element]');
			expect(result.text).toBe('Normal text');
		});
	});

	describe('Special object types', () => {
		it('should handle Date objects', () => {
			const date = new Date('2024-01-15T10:30:00Z');
			const input = {
				createdAt: date,
				name: 'Test',
			};

			const result = sanitizeJson(input) as any;
			expect(result.createdAt).toBe('2024-01-15T10:30:00.000Z');
			expect(result.name).toBe('Test');
		});

		it('should handle RegExp objects', () => {
			const regex = /test/gi;
			const input = {
				pattern: regex,
				name: 'Test',
			};

			const result = sanitizeJson(input) as any;
			expect(result.pattern).toBe('/test/gi');
			expect(result.name).toBe('Test');
		});

		it('should handle Error objects', () => {
			const error = new Error('Test error');
			error.stack = 'Error: Test error\n    at test.js:1:1';
			const input = {
				error,
				name: 'Test',
			};

			const result = sanitizeJson(input) as any;
			expect(result.error.name).toBe('Error');
			expect(result.error.message).toBe('Test error');
			expect(result.error.stack).toBe('Error: Test error\n    at test.js:1:1');
			expect(result.name).toBe('Test');
		});

		it('should handle Map objects', () => {
			const map = new Map([['key1', 'value1']]);
			const input = {
				data: map,
				name: 'Test',
			};

			const result = sanitizeJson(input) as any;
			expect(result.data).toBe('[Map]');
			expect(result.name).toBe('Test');
		});

		it('should handle Set objects', () => {
			const set = new Set([1, 2, 3]);
			const input = {
				data: set,
				name: 'Test',
			};

			const result = sanitizeJson(input) as any;
			expect(result.data).toBe('[Set]');
			expect(result.name).toBe('Test');
		});
	});

	describe('Complex mixed structures', () => {
		it('should handle deeply nested mixed structure', () => {
			const complexObj: any = {
				id: 1,
				name: 'Root',
				date: new Date('2024-01-15T10:30:00Z'),
				pattern: /test/i,
				items: [
					{ id: 1, fn: () => {} },
					{ id: 2, data: null },
					{ id: 3, nested: { deep: { value: 'deep' } } },
				],
				metadata: {
					created: new Date('2024-01-01T00:00:00Z'),
					tags: new Set(['tag1', 'tag2']),
					mapping: new Map([['key', 'value']]),
				},
				callback: function () {
					return 'test';
				},
			};

			// Add circular reference
			complexObj.items[2].nested.deep.root = complexObj;

			const result = sanitizeJson(complexObj) as any;

			expect(result.id).toBe(1);
			expect(result.name).toBe('Root');
			expect(result.date).toBe('2024-01-15T10:30:00.000Z');
			expect(result.pattern).toBe('/test/i');
			expect(result.items[0].fn).toBe('[Function]');
			expect(result.items[1].data).toBe(null);
			expect(result.items[2].nested.deep.value).toBe('deep');
			expect(result.items[2].nested.deep.root).toBe('[Circular: $]');
			expect(result.metadata.created).toBe('2024-01-01T00:00:00.000Z');
			expect(result.metadata.tags).toBe('[Set]');
			expect(result.metadata.mapping).toBe('[Map]');
			expect(result.callback).toBe('[Function]');
		});

		it('should handle arrays with circular references', () => {
			const obj1: any = { id: 1 };
			const obj2: any = { id: 2 };
			const arr: any[] = [obj1, obj2];

			obj1.array = arr;
			obj2.array = arr;
			obj1.other = obj2;
			obj2.other = obj1;

			const result = sanitizeJson(arr) as any;

			expect(result[0].id).toBe(1);
			expect(result[0].array).toBe('[Circular: $]');
			expect(result[0].other.id).toBe(2);
			expect(result[0].other.array).toBe('[Circular: $]');
			expect(result[0].other.other).toBe('[Circular: $[0]]');
			// obj2 is already visited when processing obj1.other, so it becomes circular reference
			expect(result[1]).toBe('[Circular: $[0].other]');
		});
	});

	describe('Edge cases', () => {
		it('should handle objects with null prototype', () => {
			const obj = Object.create(null);
			obj.name = 'Test';
			obj.value = 42;

			const result = sanitizeJson(obj) as any;
			expect(result.name).toBe('Test');
			expect(result.value).toBe(42);
		});

		it('should handle objects with symbol keys', () => {
			const sym = Symbol('test');
			const obj = {
				[sym]: 'symbol value',
				normal: 'normal value',
			};

			const result = sanitizeJson(obj) as any;
			// Symbol keys are not enumerable by Object.entries
			expect(result.normal).toBe('normal value');
			expect(result[sym as any]).toBeUndefined();
		});

		it('should handle very deep nesting without stack overflow', () => {
			let deep: any = { value: 'bottom' };
			for (let i = 0; i < 1000; i++) {
				deep = { nested: deep };
			}

			expect(() => sanitizeJson(deep)).not.toThrow();
		});

		it('should handle empty string keys', () => {
			const obj = {
				'': 'empty key',
				normal: 'normal key',
			};

			const result = sanitizeJson(obj) as any;
			expect(result['']).toBe('empty key');
			expect(result.normal).toBe('normal key');
		});
	});
});
