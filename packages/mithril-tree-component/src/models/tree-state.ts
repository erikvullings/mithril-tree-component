import { ITreeItem } from '.';

export interface ITreeState<T extends ITreeItem[]> {
  tree: T;
  /** ID of the selected tree item */
  selectedId?: string | number;
  /** ID of the tree item that is being dragged */
  dragId?: string | number;
}
