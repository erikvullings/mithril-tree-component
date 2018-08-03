import m, { Vnode, Component, Attributes } from 'mithril';
import { ITreeItem } from './models/tree-item';
import { IInternalTreeOptions } from './models/tree-options';
import { ITreeState } from './models/tree-state';

export const TreeItemIdPrefix = 'tree-item-';

interface ITreeItemAttributes {
  item: ITreeItem;
  options: IInternalTreeOptions;
  state: ITreeState;
  dragOptions: Attributes;
}

export const TreeItem = ({ attrs }: Vnode<ITreeItemAttributes>): Component<ITreeItemAttributes> => {
  const options = attrs.options;
  const dragOptions = attrs.dragOptions;
  const state = attrs.state;
  const name = options.name;
  const id = options.id;
  const parentId = options.parentId;
  const children = options.children;
  const isOpen = options.isOpen;
  const treeItemView = options.treeItemView;

  const treeItem = attrs.item;
  const hasChildren = () => treeItem[children] && treeItem[children].length;
  const toggle = () => {
    if (hasChildren()) {
      treeItem[isOpen] = !treeItem[isOpen];
    }
  };

  const addChildren = () => {
    if (!hasChildren()) {
      treeItem[children] = [];
      treeItem[isOpen] = true;
      options._createItem(treeItem[id]);
    }
  };

  /** Compute the current depth of a (perhaps moved) tree item, where 0 is root, 1 is child, etc. */
  const depth = (ti = treeItem, curDepth = 0): number => {
    const pId = ti[parentId];
    return pId ? depth(options._find(pId) as ITreeItem, curDepth + 1) : curDepth;
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
                m(options._button(hasChildren() ? (treeItem[isOpen] ? 'expand_less' : 'expand_more') : 'spacer'), {
                  onclick: () => toggle(),
                }),
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
            hasChildren() && treeItem[isOpen]
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
                  m(
                    'li',
                    m('.indent', m(options._button('create'), { onclick: () => options._createItem(treeItem[id]) }))
                  ),
                ])
              : '',
          ]
        ),
      ]),
  };
};
