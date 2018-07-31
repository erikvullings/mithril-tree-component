import m, { Vnode, Component, Attributes } from 'mithril';
import { ITreeItem } from './models/tree-item';
import { IInternalTreeOptions } from './models/tree-options';

export const TreeItemIdPrefix = 'tree-item-';

export const TreeItem = ({
  attrs,
}: Vnode<{ item: ITreeItem; options: IInternalTreeOptions; dragOptions: Attributes }>): Component<{
  item: ITreeItem;
  options: IInternalTreeOptions;
  dragOptions: Attributes;
}> => {
  const options = attrs.options;
  const dragOptions = attrs.dragOptions;
  const name = options.name;
  const id = options.id;
  const parentId = options.parentId;
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
        m('.tree-item', [
          m('.tree-item-header', [
            m(options._button(hasChildren() ? (treeItem[isOpen] ? 'expand_less' : 'expand_more') : 'spacer'), {
              onclick: () => toggle(),
            }),
            m('span.tree-item-title', treeItem[name]),
            m('.secondary-content', [
              m(options._button('delete'), { onclick: () => options.onDelete(treeItem) }),
              m(options._button('add_children'), { onclick: () => addChildren() }),
            ]),
          ]),
          hasChildren() && treeItem[isOpen]
            ? m('ul.tree-item-body', [
                ...treeItem.children.map((item: ITreeItem) =>
                  m(TreeItem, { item, options, dragOptions, key: item[id] })
                ),
                m(
                  'li',
                  m(
                    '.secondary-content',
                    m(options._button('create'), { onclick: () => options._createItem(treeItem[id]) })
                  )
                ),
              ])
            : '',
        ]),
      ]),
  };
};
