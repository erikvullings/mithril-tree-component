export interface ITreeItem {
  // /** Unique ID of the item. */
  // id: string | number;
  // /** Parent ID. If absent, item is considered a root element. */
  // parentId?: string | number;
  // /** Children of the tree item. */
  // children?: Array<T & ITreeItem<T>>;
  /** Any other properties. */
  [key: string]: any;
}
