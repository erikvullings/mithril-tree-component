import { IInternalTreeOptions } from './tree-options';
import { Attributes } from 'mithril';
import { ITreeItem } from '.';

export interface ITreeState {
  tree?: ITreeItem[];
  /** Name of the parent ID property (default 'parentId') */
  parentId: string;
  /** ID of the selected tree item */
  selectedId?: string | number;
  /** ID of the tree item that is being dragged */
  dragId?: string | number;
  /** Options for the tree */
  options: IInternalTreeOptions;
  /** Options for dragging */
  dragOptions: Attributes;
  /** Width of the item */
  width: number;
  /** When dragging, set this to true */
  isDragging: boolean;
}
