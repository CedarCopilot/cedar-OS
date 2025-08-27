/* eslint-disable @typescript-eslint/no-explicit-any */
import { sanitizeJson } from '../../src/utils/sanitizeJson';

describe('sanitizeJson - JSON Path Circular References', () => {
	describe('Basic circular references with paths', () => {
		it('should show root path for self-reference', () => {
			const obj: any = { id: 1 };
			obj.self = obj;

			const result = sanitizeJson(obj) as any;
			expect(result.self).toBe('[Circular: $]');
		});

		it('should show correct path for nested self-reference', () => {
			const obj: any = {
				level1: {
					level2: {
						id: 'deep',
					},
				},
			};
			obj.level1.level2.backToRoot = obj;

			const result = sanitizeJson(obj) as any;
			expect(result.level1.level2.backToRoot).toBe('[Circular: $]');
		});

		it('should show path to parent object', () => {
			const obj: any = {
				child: {
					id: 'child',
				},
			};
			obj.child.parent = obj;

			const result = sanitizeJson(obj) as any;
			expect(result.child.parent).toBe('[Circular: $]');
		});

		it('should show path to sibling', () => {
			const obj: any = {
				child1: { id: 1 },
				child2: { id: 2 },
			};
			obj.child1.sibling = obj.child2;
			obj.child2.sibling = obj.child1;

			const result = sanitizeJson(obj) as any;
			expect(result.child1.sibling.id).toBe(2);
			expect(result.child1.sibling.sibling).toBe('[Circular: $.child1]');
			expect(result.child2).toBe('[Circular: $.child1.sibling]');
		});
	});

	describe('Array circular references with paths', () => {
		it('should show array index in path', () => {
			const arr: any[] = [{ id: 1 }, { id: 2 }];
			arr[0].array = arr;
			arr[1].firstItem = arr[0];

			const result = sanitizeJson(arr) as any;
			expect(result[0].array).toBe('[Circular: $]');
			expect(result[1].firstItem).toBe('[Circular: $[0]]');
		});

		it('should handle nested arrays with circular refs', () => {
			const obj: any = {
				items: [{ name: 'first' }, { name: 'second' }],
			};
			obj.items[0].parent = obj;
			obj.items[1].prev = obj.items[0];

			const result = sanitizeJson(obj) as any;
			expect(result.items[0].parent).toBe('[Circular: $]');
			expect(result.items[1].prev).toBe('[Circular: $.items[0]]');
		});

		it('should handle array containing itself', () => {
			const arr: any[] = [1, 2];
			arr.push(arr);

			const result = sanitizeJson(arr) as any;
			expect(result[0]).toBe(1);
			expect(result[1]).toBe(2);
			expect(result[2]).toBe('[Circular: $]');
		});

		it('should handle complex array structures', () => {
			const matrix: any[] = [
				[{ id: '0,0' }, { id: '0,1' }],
				[{ id: '1,0' }, { id: '1,1' }],
			];
			matrix[0][0].next = matrix[0][1];
			matrix[0][1].next = matrix[1][0];
			matrix[1][0].next = matrix[1][1];
			matrix[1][1].next = matrix[0][0];

			const result = sanitizeJson(matrix) as any;
			expect(result[0][0].next.id).toBe('0,1');
			expect(result[0][0].next.next.id).toBe('1,0');
			expect(result[0][0].next.next.next.id).toBe('1,1');
			expect(result[0][0].next.next.next.next).toBe('[Circular: $[0][0]]');
			expect(result[0][1]).toBe('[Circular: $[0][0].next]');
			expect(result[1][0]).toBe('[Circular: $[0][0].next.next]');
			expect(result[1][1]).toBe('[Circular: $[0][0].next.next.next]');
		});
	});

	describe('Property names with special characters', () => {
		it('should quote property names with hyphens', () => {
			const obj: any = {};
			obj['special-key'] = { value: 1 };
			obj.normal = obj['special-key'];

			const result = sanitizeJson(obj) as any;
			expect(result.normal).toBe('[Circular: $["special-key"]]');
		});

		it('should quote property names with spaces', () => {
			const obj: any = {};
			obj['has spaces'] = { value: 2 };
			obj.ref = obj['has spaces'];

			const result = sanitizeJson(obj) as any;
			expect(result.ref).toBe('[Circular: $["has spaces"]]');
		});

		it('should escape quotes in property names', () => {
			const obj: any = {};
			obj['has"quote'] = { value: 3 };
			obj.ref = obj['has"quote'];

			const result = sanitizeJson(obj) as any;
			expect(result.ref).toBe('[Circular: $["has\\"quote"]]');
		});

		it('should handle numeric string keys', () => {
			const obj: any = {};
			obj['123'] = { value: 4 };
			obj.ref = obj['123'];

			const result = sanitizeJson(obj) as any;
			expect(result.ref).toBe('[Circular: $["123"]]');
		});

		it('should handle empty string keys', () => {
			const obj: any = {};
			obj[''] = { value: 5 };
			obj.ref = obj[''];

			const result = sanitizeJson(obj) as any;
			expect(result.ref).toBe('[Circular: $[""]]');
		});

		it('should handle unicode characters', () => {
			const obj: any = {};
			obj['emoji🎉key'] = { value: 6 };
			obj.ref = obj['emoji🎉key'];

			const result = sanitizeJson(obj) as any;
			expect(result.ref).toBe('[Circular: $["emoji🎉key"]]');
		});
	});

	describe('Complex nested paths', () => {
		it('should build deep paths correctly', () => {
			const obj: any = {
				a: {
					b: {
						c: {
							d: {
								e: { value: 'deep' },
							},
						},
					},
				},
			};
			obj.a.b.c.d.e.backToB = obj.a.b;

			const result = sanitizeJson(obj) as any;
			expect(result.a.b.c.d.e.backToB).toBe('[Circular: $.a.b]');
		});

		it('should handle mixed array and object paths', () => {
			const obj: any = {
				users: [
					{
						name: 'Alice',
						friends: [{ name: 'Bob' }],
					},
				],
			};
			obj.users[0].friends[0].alice = obj.users[0];

			const result = sanitizeJson(obj) as any;
			expect(result.users[0].friends[0].alice).toBe('[Circular: $.users[0]]');
		});

		it('should handle paths with mixed special and normal keys', () => {
			const obj: any = {
				normal: {
					'special-key': {
						another: {
							'with spaces': { id: 1 },
						},
					},
				},
			};
			obj.ref = obj.normal['special-key'].another['with spaces'];

			const result = sanitizeJson(obj) as any;
			expect(result.ref).toBe(
				'[Circular: $.normal["special-key"].another["with spaces"]]'
			);
		});
	});

	describe('Multiple references to same object', () => {
		it('should show first occurrence path for subsequent references', () => {
			const shared = { id: 'shared' };
			const obj = {
				first: shared,
				second: shared,
				third: shared,
			};

			const result = sanitizeJson(obj) as any;
			expect(result.first.id).toBe('shared');
			expect(result.second).toBe('[Circular: $.first]');
			expect(result.third).toBe('[Circular: $.first]');
		});

		it('should track first occurrence in arrays', () => {
			const item = { id: 'item' };
			const arr = [item, { other: item }, item];

			const result = sanitizeJson(arr) as any;
			expect(result[0].id).toBe('item');
			expect(result[1].other).toBe('[Circular: $[0]]');
			expect(result[2]).toBe('[Circular: $[0]]');
		});

		it('should handle diamond pattern references', () => {
			const leaf = { value: 'leaf' };
			const obj: any = {
				left: {
					child: leaf,
				},
				right: {
					child: leaf,
				},
			};
			obj.left.sibling = obj.right;
			obj.right.sibling = obj.left;

			const result = sanitizeJson(obj) as any;
			expect(result.left.child.value).toBe('leaf');
			expect(result.left.sibling.child).toBe('[Circular: $.left.child]');
			expect(result.right).toBe('[Circular: $.left.sibling]');
		});
	});

	describe('Edge cases', () => {
		it('should handle circular reference at multiple levels', () => {
			const obj: any = { level1: {} };
			obj.level1.level2 = {};
			obj.level1.level2.backToLevel1 = obj.level1;
			obj.level1.level2.backToRoot = obj;

			const result = sanitizeJson(obj) as any;
			expect(result.level1.level2.backToLevel1).toBe('[Circular: $.level1]');
			expect(result.level1.level2.backToRoot).toBe('[Circular: $]');
		});

		it('should handle object that references its container array', () => {
			const arr: any[] = [];
			const obj = { id: 1, container: arr };
			arr.push(obj);

			const result = sanitizeJson(arr) as any;
			expect(result[0].id).toBe(1);
			expect(result[0].container).toBe('[Circular: $]');
		});

		it('should handle mutual circular references', () => {
			const a: any = { name: 'A' };
			const b: any = { name: 'B' };
			const c: any = { name: 'C' };

			a.next = b;
			b.next = c;
			c.next = a;

			const result = sanitizeJson(a) as any;
			expect(result.name).toBe('A');
			expect(result.next.name).toBe('B');
			expect(result.next.next.name).toBe('C');
			expect(result.next.next.next).toBe('[Circular: $]');
		});

		it('should handle circular reference in object with function', () => {
			const obj: any = {
				data: 'test',
				fn: () => {},
			};
			obj.self = obj;

			const result = sanitizeJson(obj) as any;
			expect(result.data).toBe('test');
			expect(result.fn).toBe('[Function]');
			expect(result.self).toBe('[Circular: $]');
		});

		it('should preserve path through null and undefined values', () => {
			const obj: any = {
				valid: { id: 1 },
				nullValue: null,
				undefinedValue: undefined,
				reference: null,
			};
			obj.reference = obj.valid;

			const result = sanitizeJson(obj) as any;
			expect(result.valid.id).toBe(1);
			expect(result.nullValue).toBe(null);
			expect(result.undefinedValue).toBe(undefined);
			expect(result.reference).toBe('[Circular: $.valid]');
		});
	});

	describe('Real-world scenarios', () => {
		it('should handle DOM-like tree structure', () => {
			const root: any = {
				tagName: 'div',
				children: [],
			};
			const child1: any = {
				tagName: 'span',
				parent: root,
				children: [],
			};
			const child2: any = {
				tagName: 'p',
				parent: root,
				children: [],
			};
			root.children.push(child1, child2);
			child1.nextSibling = child2;
			child2.prevSibling = child1;

			const result = sanitizeJson(root) as any;
			expect(result.children[0].parent).toBe('[Circular: $]');
			expect(result.children[0].nextSibling.parent).toBe('[Circular: $]');
			expect(result.children[0].nextSibling.prevSibling).toBe(
				'[Circular: $.children[0]]'
			);
			expect(result.children[1]).toBe('[Circular: $.children[0].nextSibling]');
		});

		it('should handle graph-like structure', () => {
			const nodeA: any = { id: 'A', edges: [] };
			const nodeB: any = { id: 'B', edges: [] };
			const nodeC: any = { id: 'C', edges: [] };

			nodeA.edges.push({ to: nodeB, weight: 5 });
			nodeB.edges.push({ to: nodeC, weight: 3 });
			nodeC.edges.push({ to: nodeA, weight: 2 });

			const graph = { nodes: [nodeA, nodeB, nodeC] };

			const result = sanitizeJson(graph) as any;
			expect(result.nodes[0].edges[0].to.id).toBe('B');
			expect(result.nodes[0].edges[0].to.edges[0].to.id).toBe('C');
			expect(result.nodes[0].edges[0].to.edges[0].to.edges[0].to).toBe(
				'[Circular: $.nodes[0]]'
			);
			expect(result.nodes[1]).toBe('[Circular: $.nodes[0].edges[0].to]');
			expect(result.nodes[2]).toBe(
				'[Circular: $.nodes[0].edges[0].to.edges[0].to]'
			);
		});

		it('should handle state management store pattern', () => {
			const store: any = {
				state: {
					user: { name: 'Alice' },
					posts: [],
				},
				actions: {},
			};

			const post1 = {
				id: 1,
				author: store.state.user,
				store: store,
			};

			store.state.posts.push(post1);
			store.actions.getFirstPost = () => store.state.posts[0];

			const result = sanitizeJson(store) as any;
			expect(result.state.posts[0].author).toBe('[Circular: $.state.user]');
			expect(result.state.posts[0].store).toBe('[Circular: $]');
			expect(result.actions.getFirstPost).toBe('[Function]');
		});
	});
});
