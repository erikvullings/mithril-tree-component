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

  const treeItem = attrs.item;
  const hasChildren = () => treeItem[children] && treeItem[children].length;
  const toggle = () => {
    if (hasChildren()) {
      if (isOpen) {
        treeItem[isOpen] = !treeItem[isOpen];
      } else {
        tiState.isOpen = !tiState.isOpen;
      }
    }
  };

  const addChildren = () => {
    if (!hasChildren()) {
      treeItem[children] = [];
      if (isOpen) {
        treeItem[isOpen] = true;
      }
      options._createItem(treeItem[id]);
    }
  };

  /** Compute the current depth of a (perhaps moved) tree item, where 0 is root, 1 is child, etc. */
  const depth = (ti = treeItem, curDepth = 0): number => {
    const pId = ti[parentId];
    return pId ? depth(options._find(pId) as ITreeItem, curDepth + 1) : curDepth;
  };

  const isExpanded = () => hasChildren() && ((isOpen && treeItem[isOpen]) || tiState.isOpen);

  const tiState = {
    isOpen: false,
  };

  return {
    view: () =>
      m(`li[id=${TreeItemIdPrefix}${treeItem[id]}][draggable=${options.editable.canUpdate}]`, dragOptions, [
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
                    hasChildren()
                      ? (isOpen && treeItem[isOpen]) || tiState.isOpen
                        ? 'expand_less'
                        : 'expand_more'
                      : 'spacer'
                  ),
                  {
                    onclick: () => toggle(),
                  }
                ),
                m(
                  'span.tree-item-title',
                  { class: `${options.editable.canUpdate ? 'moveable' : ''}` },
                  m(treeItemView, { treeItem, depth: depth() })
                ),
              ],
              m('.act-group', [
                options.editable.canCreate && !hasChildren() && depth() < options.maxDepth
                  ? m(options._button('add_children'), { onclick: () => addChildren() })
                  : '',
                options.editable.canDelete && (options.editable.canDeleteParent || !hasChildren())
                  ? m(options._button('delete'), { onclick: () => options.onDelete(treeItem) })
                  : '',
              ])
            ),
            isExpanded()
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
      ]),
  };
};
