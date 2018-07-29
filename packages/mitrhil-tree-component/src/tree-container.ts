import m, { Component, Vnode, Attributes } from 'mithril';
import { TreeItem } from './tree-item';
import { ITreeOptions } from './models/tree-options';
import { ITreeItem } from './models/tree-item';
import { uuid4 } from './utils/utils';

export const TreeContainer = <T extends ITreeItem[]>({
  attrs,
}: Vnode<{ tree: T; options?: Partial<ITreeOptions> }>) => {
  const tree = attrs.tree;

  const setDefaultOptions = () => {
    const wrapper = (
      defaultFn: (treeItem: ITreeItem) => void,
      beforeFn?: (treeItem: ITreeItem) => boolean,
      afterFn?: (treeItem: ITreeItem) => void
    ) => (treeItem: ITreeItem) => {
      if (beforeFn && beforeFn(treeItem) === false) {
        return;
      }
      defaultFn(treeItem);
      if (afterFn) {
        afterFn(treeItem);
      }
    };
    const defaultOptions = {
      id: 'id',
      parentId: 'parentId',
      children: 'children',
      name: 'name',
      isOpen: 'isOpen',
      editable: { canCreate: false, canDelete: false, canUpdate: false },
    } as Partial<ITreeOptions>;
    const opts = {
      ...defaultOptions,
      ...attrs.options,
    } as ITreeOptions;

    const id = opts.id;
    const parentId = opts.parentId;
    const name = opts.name;
    const children = opts.children;

    /** Recursively find a tree item */
    const find = (tId: string | number = '', partialTree: T = tree) => {
      if (!tId) {
        return undefined;
      }
      let found: ITreeItem | undefined;
      partialTree.some(treeItem => {
        found = treeItem[children] ? find(tId, treeItem[children]) : undefined;
        if (found) {
          return true;
        }
        if (treeItem[id] === tId) {
          found = treeItem;
          return true;
        }
        return false;
      });
      return found;
    };

    /** Create a new tree item. */
    const createTreeItem = (pId: string | number = '') => {
      const create = () => {
        if (options.create) {
          return options.create();
        }
        const item = {} as ITreeItem;
        item[id] = uuid4();
        if (pId) {
          const parent = find(pId);
          item[parentId] = parent ? parent[id] : undefined;
        }
        item[name] = 'New...';
        return item;
      };
      options.oncreate(create());
    };

    const button: (
      name: 'create' | 'delete' | 'up' | 'down' | 'indent' | 'outdent' | 'expand_more' | 'expand_less'
    ) => Component<Attributes> = (
      buttonName: 'create' | 'delete' | 'up' | 'down' | 'indent' | 'outdent' | 'expand_more' | 'expand_less'
    ) => {
      if (opts.button) {
        return opts.button(buttonName);
      }
      const textSymbol = () => {
        switch (buttonName) {
          case 'create':
            return '+';
          case 'delete':
            return '-';
          case 'up':
            return '&uarr;';
          case 'down':
            return '&darr;';
          case 'indent':
            return '&rarr;';
          case 'outdent':
            return '&larr;';
          case 'expand_more':
            return 'v';
          case 'expand_less':
            return '^';
        }
      };
      return {
        view: (vnode: Vnode) => m('span.clickable', vnode.attrs, textSymbol()),
      };
    };

    return {
      ...opts,
      _button: button,
      _find: find,
      _createItem: createTreeItem,
      oncreate: wrapper((i: ITreeItem) => tree.push(i), opts.onbeforecreate, opts.oncreate),
    } as ITreeOptions;
  };
  const options = setDefaultOptions();

  return {
    view: () =>
      m('ul.tree-container', [
        ...tree.map(item => m(TreeItem, { item, options })),
        m(
          'li',
          m(
            '.tree-item.clickable',
            options.editable.canCreate
              ? m(
                  '.secondary-content',
                    m(options._button('create'), { onclick: () => options._createItem() })
                )
              : ''
          )
        ),
      ]),
  } as Component<{ tree: T }>;
};
