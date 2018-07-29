import m, { Vnode, Component } from 'mithril';
import { ITreeItem } from './models/tree-item';
import { ITreeOptions } from './models/tree-options';

export const TreeItem = ({
  attrs,
}: Vnode<{ item: ITreeItem; options: ITreeOptions }>): Component<{
  item: ITreeItem;
  options: ITreeOptions;
  }> => {
  const options = attrs.options;
  const name = options.name;
  const id = options.id;
  const parentId = options.parentId;
  const children = options.children;
  const isOpen = options.isOpen;

  const treeItem = attrs.item;
  const hasChildren = treeItem[children] && treeItem[children].length;
  const toggle = () => {
    if (hasChildren) {
      treeItem[isOpen] = !treeItem[isOpen];
    }
  };

  const changeType = () => {
    if (!hasChildren) {
      treeItem[children] = [];
      treeItem[isOpen] = true;
      // addSibling();
    }
  };

  return {
    view: () =>
      m('li', [
        m('.tree-item', [
          m('.tree-item-header', [
            hasChildren
              ? m(options._button(treeItem.isExpanded ? 'expand_less' : 'expand_more'), { onclick: () => toggle() })
              : m(options._button('outdent'), { onclick: () => changeType() }),
            m('span', treeItem.title),
          ]),
          hasChildren && treeItem.isExpanded
            ? m('ul.tree-item-body', [
                ...treeItem.children.map((item: ITreeItem) => m(TreeItem, { item, options })),
                m(
                  'li',
                  m(options._button('create'), { onclick: () => options._createItem(treeItem.id) })
                ),
              ])
            : '',
        ]),
      ]),
  };
};
