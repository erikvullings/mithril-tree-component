import m, { Vnode, Component, Attributes } from 'mithril';
import { ITreeItem } from './models/tree-item';
import { IInternalTreeOptions } from './models/tree-options';
import { ITreeState } from './models/tree-state';

export const TreeItemIdPrefix = 'tree-item-';

export const TreeItem = ({
  attrs,
}: Vnode<{ item: ITreeItem; options: IInternalTreeOptions; dragOptions: Attributes; state: ITreeState }>): Component<{
  item: ITreeItem;
  options: IInternalTreeOptions;
  state: ITreeState;
  dragOptions: Attributes;
}> => {
  const options = attrs.options;
  const dragOptions = attrs.dragOptions;
  const state = attrs.state;
  const name = options.name;
  const id = options.id;
  // const parentId = options.parentId;
  const children = options.children;
  const isOpen = options.isOpen;

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

  return {
    view: () =>
      m(`li[id=${TreeItemIdPrefix}${treeItem[id]}][draggable=${options.editable.canUpdate}]`, dragOptions, [
        m(
          '.tree-item',
          {
            onclick: (ev: MouseEvent) => {
              ev.stopPropagation();
              options.onSelect(treeItem, state.selectedId !== treeItem[id]);
              // const target: any = ev.target || ev.srcElement;
              // target.classList.toggle('active');
              // if (options.onSelect) {
              //   const isSelected = target.classList.contains('active');
              //   options.onSelect(treeItem, isSelected);
              // }
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
                m('span.tree-item-title', { class: `${options.editable.canUpdate ? 'moveable' : ''}` }, treeItem[name]),
              ],
              m('.act-group', [
                options.editable.canCreate && !hasChildren()
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
                    m(TreeItem, { item, options, dragOptions, state, key: item[id] })
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
