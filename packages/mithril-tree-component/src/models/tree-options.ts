import { Component, Attributes } from 'mithril';
import { ITreeItem } from './tree-item';

/** Indicates the type of action is performed on the tree item. */
export type TreeItemAction =
  | 'create'
  | 'delete'
  | 'add_children'
  | 'expand_more'
  | 'expand_less'
  | 'spacer';

/** Indicates the type of UPDATE action is performed on the tree item. */
export type TreeItemUpdateAction = 'edit' | 'move';

export interface ITreeOptions {
  /** Name of the name property, e.g. how the tree item is displayed in the tree (default 'name') */
  name: string;
  /** Name of the ID property (default 'id') */
  id: string;
  /** Name of the parent ID property (default 'parentId') */
  parentId: string;
  /** Name of the children property (default 'children') */
  children: string;
  /** Name of the open property, e.g. to display or hide the children (default 'isOpen') */
  isOpen: string;
  /**
   * At what level do you prevent creating new children: 1 is only children, 2 is grandchildren, etc.
   * Default is Number.MAX_SAFE_INTEGER. NOTE: It does not prevent you to move items with children.
   */
  maxDepth: number;
  /** If true (default), you can have multiple root nodes */
  multipleRoots: boolean;
  /** If enabled, turn on logging */
  logging: boolean;
  /** When a tree item is selected, this function is invoked */
  onSelect: (treeItem: ITreeItem, isSelected: boolean) => void;
  /** Before a tree item is created, this function is invoked. When it returns false, the action is cancelled. */
  onBeforeCreate: (treeItem: ITreeItem) => boolean;
  /** When a tree item is created, this function is invoked */
  onCreate: (treeItem: ITreeItem) => void;
  /** Before a tree item is deleted, this function is invoked. When it returns false, the action is cancelled. */
  onBeforeDelete: (treeItem: ITreeItem) => boolean;
  /** When a tree item is deleted, this function is invoked */
  onDelete: (treeItem: ITreeItem) => void;
  /** Before a tree item is updated, this function is invoked. When it returns false, the action is cancelled. */
  onBeforeUpdate: (treeItem: ITreeItem, action?: TreeItemUpdateAction, newParent?: ITreeItem) => boolean;
  /** When a tree item is updated, this function is invoked */
  onUpdate: (treeItem: ITreeItem, action?: TreeItemUpdateAction, newParent?: ITreeItem) => void;
  /**
   * Factory function that can be used to create new items.
   * If parent treeItem is missing, a root item should be created.
   */
  create: (parent?: ITreeItem) => ITreeItem;
  /** Does the tree support editing, e.g. creating, deleting or updating. */
  editable: Partial<{
    /** Allow creating of new items. */
    canCreate: boolean;
    /** Allow deleting of items. */
    canDelete: boolean;
    /** Allow deleting of items that are parents (so all children would be deleted too). */
    canDeleteParent: boolean;
    /** Allow updating of items. */
    canUpdate: boolean;
  }>;
  /**
   * Component to display icons to create, delete, etc.
   * The component will receive an onclick attribute to perform its function.
   */
  button: (name: TreeItemAction) => Component<Attributes>;
}

export interface IInternalTreeOptions extends ITreeOptions {
  /** Internal function: creates a button either using the button component, or a simple text node */
  _button: (name: TreeItemAction) => Component<Attributes>;
  /** Internal function: retrieves the tree item based on its id */
  _find: (id: string | number) => ITreeItem | undefined;
  /** Internal function: creates a sibling tree item  */
  _createItem: (siblingId?: string | number) => void;
  _deleteItem: (id?: string | number) => void;
}
