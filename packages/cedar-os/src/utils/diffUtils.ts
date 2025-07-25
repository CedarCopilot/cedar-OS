/**
 * Adds an item to an array immutably.
 * @param arr The original array (may be undefined or null).
 * @param item The item to add.
 * @returns A new array containing all original items and the new item.
 */
export function addToArray<T>(arr: T[] | null | undefined, item: T): T[] {
	return arr ? [...arr, item] : [item];
}

/**
 * Adds or updates a key/value pair in an object immutably.
 * @param obj The original object (may be undefined or null).
 * @param key The key to add or update.
 * @param value The value to assign.
 * @returns A new object with the key/value merged.
 */
export function addToObject<T extends Record<string, any>, K extends string, V>(
	obj: T | null | undefined,
	key: K,
	value: V
): T & Record<K, V> {
	return {
		...(obj || {}),
		[key]: value,
	} as T & Record<K, V>;
}
