/**
 * Convert an item array to a tree. Assumes each item has a parentId.
 * @param items Items
 */
export const unflatten = <T extends { id: string | number; parentId?: string | number }>(
  entities: T[],
  // parent = {} as T & ITree<T>,
  // tree = [] as Array<T & ITree<T>>
  parent = { id: null } as { id: string | number | null; children?: T[] },
  tree = [] as Array<T & { children: T[] }>
) => {
  const children = (parent.id
    ? entities.filter(entity => entity.parentId === parent.id)
    : entities.filter(entity => !entity.parentId)) as Array<T & { children: T[] }>;

  if (children.length > 0) {
    if (!parent.id) {
      tree = children;
    } else {
      parent.children = children;
    }
    children.map(child => unflatten(entities, child));
  }

  return tree;
};
