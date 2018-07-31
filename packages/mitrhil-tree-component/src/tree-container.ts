import m, { Component, Vnode, Attributes } from 'mithril';
import { TreeItem, TreeItemIdPrefix } from './tree-item';
import { ITreeOptions, TreeItemAction, IInternalTreeOptions } from './models/tree-options';
import { ITreeItem } from './models/tree-item';
import { uuid4 } from './utils/utils';

export const TreeContainer = <T extends ITreeItem[]>({
  attrs,
}: Vnode<{ tree: T; options?: Partial<ITreeOptions> }>): Component<{ tree: T; options?: Partial<ITreeOptions> }> => {
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
      maxDepth: Number.MAX_SAFE_INTEGER,
      multipleRoots: true,
      editable: { canCreate: false, canDelete: false, canUpdate: false },
    } as Partial<IInternalTreeOptions>;
    const opts = {
      ...defaultOptions,
      ...attrs.options,
    } as IInternalTreeOptions;

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
        if (treeItem[id] === tId) {
          found = treeItem;
          return true;
        }
        found = treeItem[children] ? find(tId, treeItem[children]) : undefined;
        return found ? true : false;
      });
      return found;
    };

    /** Recursively delete a tree item and all its children */
    const deleteTreeItem = (tId: string | number = '', partialTree: T = tree) => {
      if (!tId) {
        return false;
      }
      let found = false;
      partialTree.some((treeItem, i) => {
        if (treeItem[id] === tId) {
          partialTree.splice(i, 1);
          found = true;
          return true;
        }
        found = treeItem[children] ? deleteTreeItem(tId, treeItem[children]) : false;
        if (found && treeItem[children].length === 0) {
          delete treeItem[children];
          delete treeItem[opts.isOpen];
        }
        return found;
      });
      return found;
    };

    /** Recursively delete a tree item and all its children */
    const updateTreeItem = (updatedTreeItem: ITreeItem, partialTree: T = tree) => {
      let found = false;
      partialTree.some((treeItem, i) => {
        if (treeItem[id] === updatedTreeItem[id]) {
          partialTree[i] = updatedTreeItem;
          found = true;
          return true;
        }
        found = treeItem[children] ? updateTreeItem(updatedTreeItem, treeItem[children]) : false;
        return found;
      });
      return found;
    };

    const button: (name: TreeItemAction) => Component<Attributes> = (buttonName: TreeItemAction) => {
      if (opts.button) {
        return opts.button(buttonName);
      }
      const textSymbol = () => {
        switch (buttonName) {
          case 'create':
            return '+';
          case 'delete':
            return 'x';
          case 'add_children':
            return '>';
          case 'expand_more':
            return '►';
          case 'expand_less':
            return '◢';
          case 'spacer':
            return ' ';
        }
      };
      return {
        view: (vnode: Vnode) => m('span.clickable', vnode.attrs, textSymbol()),
      };
    };

    /** Create a new tree item. */
    const createTreeItem = (pId: string | number = '') => {
      const create = () => {
        if (options.create) {
          return options.create(find(pId));
        }
        const item = {} as ITreeItem;
        item[id] = uuid4();
        item[parentId] = pId;
        item[name] = 'New...';
        return item;
      };
      options.onCreate(create());
    };

    const onCreate = wrapper(
      (ti: ITreeItem) => {
        const parent = find(ti[parentId]);
        if (parent) {
          parent[children].push(ti);
        } else {
          tree.push(ti);
        }
      },
      opts.onBeforeCreate,
      opts.onCreate
    );

    const onDelete = wrapper((ti: ITreeItem) => deleteTreeItem(ti[id]), opts.onBeforeDelete, opts.onDelete);

    const onUpdate = wrapper((ti: ITreeItem) => updateTreeItem(ti), opts.onBeforeUpdate, opts.onUpdate);

    const dragOpts = {
      ondrop: (ev: any) => {
        console.time('ondrop');
        ev.preventDefault(); // do not open a link
        const convertId = (cid: string | number) => (isNaN(+cid) ? cid : +cid);
        const sourceId = convertId(ev.dataTransfer.getData('text').replace(TreeItemIdPrefix, ''));
        const targetId = convertId((findId(ev.target) || '').replace(TreeItemIdPrefix, ''));
        const tiSource = find(sourceId);
        const tiTarget = find(targetId);
        if (tiSource && tiTarget) {
          deleteTreeItem(sourceId);
          tiSource[parentId] = tiTarget[id];
          if (!tiTarget[children]) {
            tiTarget[children] = [];
          }
          tiTarget[children].push(tiSource);
        }
        // ev.target.appendChild(document.getElementById(data));
        console.log('Drop: ' + sourceId);
        const target = ev.target;
        if (target) {
          console.log('Dropped on: ' + findId(ev.target));
        }
        console.timeEnd('ondrop');
      },
      ondragover: (ev: any) => ev.preventDefault(),
      ondragstart: (ev: DragEvent) => {
        const target = ev.target;
        if (target) {
          ev.dataTransfer.setData('text', (target as any).id);
        }
        console.log('Drag start: ' + ev.dataTransfer.getData('text'));
      },
    } as Attributes;

    return {
      dragOptions: dragOpts,
      options: {
        ...opts,
        _button: button,
        _find: find,
        onCreate,
        onDelete,
        onUpdate,
        _deleteItem: deleteTreeItem,
        _createItem: createTreeItem,
      } as IInternalTreeOptions,
    };
  };
  const { options, dragOptions } = setDefaultOptions();

  /** Find the ID of the first parent element. */
  const findId = (el: HTMLElement): string | null =>
    el.id ? el.id : el.parentElement ? findId(el.parentElement) : null;

  return {
    view: () =>
      m('ul.tree-container', [
        ...tree.map(item => m(TreeItem, { item, options, dragOptions, key: item[options.id] })),
        m(
          'li',
          m(
            '.tree-item.clickable',
            options.editable.canCreate && options.multipleRoots
              ? m('.secondary-content', m(options._button('create'), { onclick: () => options._createItem() }))
              : ''
          )
        ),
      ]),
  } as Component<{ tree: T; options?: Partial<ITreeOptions> }>;
};
