import { IInternalTreeOptions } from './tree-options';
import { Attributes } from 'mithril';
import { ITreeItem } from '.';

export interface ITreeState {
  tree?: ITreeItem[];
  /** ID of the selected tree item */
  selectedId?: string | number;
  /** ID of the tree item that is being dragged */
  dragId?: string | number;
  /** Options for the tree */
  options: IInternalTreeOptions;
  /** Options for dragging */
  dragOptions: Attributes;
}
