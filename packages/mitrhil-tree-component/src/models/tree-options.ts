import { Component, Attributes } from 'mithril';
import { ITreeItem } from './tree-item';

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
  /** When a tree item is selected, this function is invoked */
  onselect: (treeItem: ITreeItem) => void;
  /** Before a tree item is created, this function is invoked. When it returns false, the action is cancelled. */
  onbeforecreate: (treeItem: ITreeItem) => boolean;
  /** When a tree item is created, this function is invoked */
  oncreate: (treeItem: ITreeItem) => void;
  /** Before a tree item is deleted, this function is invoked. When it returns false, the action is cancelled. */
  onbeforedelete: (treeItem: ITreeItem) => boolean;
  /** When a tree item is deleted, this function is invoked */
  ondelete: (treeItem: ITreeItem) => void;
  /** Before a tree item is updated, this function is invoked. When it returns false, the action is cancelled. */
  onbeforeupdate: (treeItem: ITreeItem) => boolean;
  /** When a tree item is updated, this function is invoked */
  onupdate: (treeItem: ITreeItem) => void;
  /**
   * Factory function that can be used to create new items.
   * If parent treeItem is missing, a root item should be created.
   */
  create: (parent?: ITreeItem) => ITreeItem;
  /** Does the tree support editing, e.g. creating, deleting or updating. */
  editable: {
    /** Allow creating of new items. */
    canCreate: boolean;
    /** Allow deleting of new items. */
    canDelete: boolean;
    /** Allow updating of new items. */
    canUpdate: boolean;
  };
  /**
   * Component to display icons to create, delete, etc.
   * The component will receive an onclick attribute to perform its function.
   */
  button: (
    name: 'create' | 'delete' | 'up' | 'down' | 'indent' | 'outdent' | 'expand_more' | 'expand_less'
  ) => Component<Attributes>;
  /** Internal function: creates a button either using the button component, or a simple text node */
  _button: (
    name: 'create' | 'delete' | 'up' | 'down' | 'indent' | 'outdent' | 'expand_more' | 'expand_less'
  ) => Component<Attributes>;
  /** Internal function: retrieves the tree item based on its id */
  _find: (id: string | number) => ITreeItem | undefined;
  /** Internal function: creates a sibling tree item  */
  _createItem: (siblingId?: string | number) => ITreeItem;
}
