import m, { Vnode, Component, Attributes } from 'mithril';
import { ITreeItem } from './models/tree-item';
import { IInternalTreeOptions } from './models/tree-options';
import { ITreeState } from './models/tree-state';

export const TreeItemIdPrefix = 'tree-item-';

interface ITreeItemAttributes<T extends ITreeItem[]> {
  item: ITreeItem;
  options: IInternalTreeOptions;
  state: ITreeState<T>;
  dragOptions: Attributes;
}

export const TreeItem = <T extends ITreeItem[]>({
  attrs,
}: Vnode<ITreeItemAttributes<T>>): Component<ITreeItemAttributes<T>> => {
  const options = attrs.options;
  const dragOptions = attrs.dragOptions;
  const state = attrs.state;
  const id = options.id;
  const parentId = options.parentId;
  const children = options.children;
  const isOpen = options.isOpen;
  const treeItemView = options.treeItemView;

  const hasChildren = (treeItem: ITreeItem) => treeItem[children] && treeItem[children].length;
  const toggle = (treeItem: ITreeItem) => {
    if (hasChildren(treeItem)) {
      if (isOpen) {
        treeItem[isOpen] = !treeItem[isOpen];
      } else {
        tiState.isOpen = !tiState.isOpen;
      }
    }
  };

  const addChildren = (treeItem: ITreeItem) => {
    if (!hasChildren(treeItem)) {
      treeItem[children] = [];
      if (isOpen) {
        treeItem[isOpen] = true;
      }
      options._createItem(treeItem[id]);
    }
  };

  /** Compute the current depth of a (perhaps moved) tree item, where 0 is root, 1 is child, etc. */
  const depth = (treeItem: ITreeItem, curDepth = 0): number => {
    const pId = treeItem[parentId];
    return pId ? depth(options._find(pId) as ITreeItem, curDepth + 1) : curDepth;
  };

  const isExpanded = (treeItem: ITreeItem) => hasChildren(treeItem) && ((isOpen && treeItem[isOpen]) || tiState.isOpen);

  const tiState = {
    isOpen: false,
  };

  return {
    view: (vnode) => {
      const treeItem = vnode.attrs.item;
      return m(`li[id=${TreeItemIdPrefix}${treeItem[id]}][draggable=${options.editable.canUpdate}]`, dragOptions, [
        m(
          '.tree-item',
          {
            onclick: (ev: MouseEvent) => {
              ev.stopPropagation();
              options.onSelect(treeItem, state.selectedId !== treeItem[id]);
            },
          },
          [
            m(
              '.tree-item-header.clearfix',
              {
                class: `${state.selectedId === treeItem[id] ? 'active' : ''}`,
              },
              [
                m(
                  options._button(
                    hasChildren(treeItem)
                      ? (isOpen && treeItem[isOpen]) || tiState.isOpen
                        ? 'expand_less'
                        : 'expand_more'
                      : 'spacer'
                  ),
                  {
                    onclick: () => toggle(treeItem),
                  }
                ),
                m(
                  'span.tree-item-title',
                  { class: `${options.editable.canUpdate ? 'moveable' : ''}` },
                  m(treeItemView, { treeItem, depth: depth(treeItem) })
                ),
              ],
              m('.act-group', [
                options.editable.canCreate && !hasChildren(treeItem) && depth(treeItem) < options.maxDepth
                  ? m(options._button('add_children'), { onclick: () => addChildren(treeItem) })
                  : '',
                options.editable.canDelete && (options.editable.canDeleteParent || !hasChildren(treeItem))
                  ? m(options._button('delete'), { onclick: () => options.onDelete(treeItem) })
                  : '',
              ])
            ),
            isExpanded(treeItem)
              ? m('ul.tree-item-body', [
                  ...treeItem.children.map((item: ITreeItem) =>
                    m(TreeItem, {
                      item,
                      options,
                      dragOptions,
                      state,
                      key: item[id],
                    })
                  ),
                  options.editable.canCreate
                    ? m(
                        'li',
                        m('.indent', m(options._button('create'), { onclick: () => options._createItem(treeItem[id]) }))
                      )
                    : '',
                ])
              : '',
          ]
        ),
      ]);
    },
  };
};
