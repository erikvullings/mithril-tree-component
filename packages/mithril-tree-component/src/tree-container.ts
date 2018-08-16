import m, { Component, Vnode, Attributes } from 'mithril';
import { TreeItem, TreeItemIdPrefix } from './tree-item';
import {
  ITreeOptions,
  TreeItemAction,
  IInternalTreeOptions,
  TreeItemUpdateAction,
  ITreeItemViewComponent,
} from './models/tree-options';
import { ITreeItem } from './models/tree-item';
import { uuid4 } from './utils/utils';
import { ITreeState } from './models/tree-state';

export let log: (...args: any[]) => void = () => undefined;

export const TreeContainer = <T extends ITreeItem[]>({
  attrs,
}: Vnode<{ tree: T; options?: Partial<ITreeOptions> }>): Component<{ tree: T; options?: Partial<ITreeOptions> }> => {
  const state: ITreeState<T> = {
    tree: attrs.tree,
    selectedId: '',
    dragId: '',
  };

  const setDefaultOptions = () => {
    const wrapper = (
      defaultFn: (treeItem: ITreeItem, action?: TreeItemUpdateAction, newParent?: ITreeItem) => void,
      beforeFn?: (
        treeItem: ITreeItem,
        action?: TreeItemUpdateAction,
        newParent?: ITreeItem
      ) => boolean | void | Promise<boolean>,
      afterFn?: (treeItem: ITreeItem, action?: TreeItemUpdateAction, newParent?: ITreeItem) => void | Promise<void>
    ) => async (treeItem: ITreeItem, action?: TreeItemUpdateAction, newParent?: ITreeItem) => {
      if (beforeFn) {
        const before = beforeFn(treeItem, action, newParent);
        const isAsync = typeof before !== 'boolean';
        const result = isAsync ? await before : before;
        if (result === false) {
          return;
        }
      }
      const r = defaultFn(treeItem, action, newParent);
      if (typeof r === 'function') {
        await r;
      }
      if (afterFn) {
        const after = afterFn(treeItem, action, newParent);
        if (typeof after === 'function') {
          await after;
        }
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
      logging: false,
      editable: { canCreate: false, canDelete: false, canUpdate: false, canDeleteParent: false },
    } as Partial<IInternalTreeOptions>;
    const opts = {
      ...defaultOptions,
      ...attrs.options,
    } as IInternalTreeOptions;

    if (opts.logging) {
      log = console.log;
    }
    const id = opts.id;
    const parentId = opts.parentId;
    const name = opts.name;
    const children = opts.children;
    const isOpen = opts.isOpen;

    const button: (name: TreeItemAction) => Component<Attributes> = (buttonName: TreeItemAction) => {
      if (opts.button) {
        return opts.button(buttonName);
      }
      const textSymbol = () => {
        switch (buttonName) {
          case 'add_children':
          case 'create':
            return '✚';
          case 'delete':
            return '✖';
          case 'expand_more':
            return '►';
          case 'expand_less':
            return '◢';
          case 'spacer':
            return '';
        }
      };
      const classNames = () => {
        switch (buttonName) {
          case 'expand_more':
          case 'expand_less':
            return 'span.clickable.collapse-expand-item';
          case 'spacer':
            return 'span.spacer';
          default:
            return '.act';
        }
      };
      return {
        view: (vnode: Vnode) => m(`${classNames()}`, vnode.attrs, textSymbol()),
      };
    };

    /** Recursively find a tree item */
    const find = (tId: string | number = '', partialTree: T = state.tree) => {
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
    const deleteTreeItem = (tId: string | number = '', partialTree: T = state.tree) => {
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
          if (opts.isOpen) {
            delete treeItem[opts.isOpen];
          }
        }
        return found;
      });
      return found;
    };

    /** Recursively delete a tree item and all its children */
    const updateTreeItem = (updatedTreeItem: ITreeItem, partialTree: T = state.tree) => {
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

    const depth = (treeItem: ITreeItem, curDepth = 0): number => {
      const pId = treeItem[parentId];
      return pId ? depth(find(pId) as ITreeItem, curDepth + 1) : curDepth;
    };

    /** Create a new tree item. */
    const createTreeItem = (pId: string | number = '') => {
      const create = () => {
        if (options.create) {
          const parent = find(pId);
          const d = parent ? depth(parent) : -1;
          return options.create(parent, d);
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
          if (!(parent[children] instanceof Array)) {
            parent[children] = [];
          }
          parent[children].push(ti);
          if (isOpen) {
            parent[isOpen] = true;
          }
        } else {
          state.tree.push(ti);
        }
      },
      opts.onBeforeCreate,
      opts.onCreate
    );

    const onDelete = wrapper((ti: ITreeItem) => deleteTreeItem(ti[id]), opts.onBeforeDelete, opts.onDelete);

    const onUpdate = wrapper(
      (ti: ITreeItem, action: TreeItemUpdateAction = 'edit', newParent?: ITreeItem) => updateTreeItem(ti),
      opts.onBeforeUpdate,
      opts.onUpdate
    );

    const onSelect = (ti: ITreeItem, isSelected: boolean) => {
      state.selectedId = isSelected ? ti[id] : '';
      if (opts.onSelect) {
        opts.onSelect(ti, isSelected);
      }
    };

    const treeItemView =
      opts.treeItemView ||
      ({
        view: (vnode: Vnode<ITreeItemViewComponent>) => vnode.attrs.treeItem[name],
      } as Component<ITreeItemViewComponent>);

    const dragOpts = {
      ondrop: (ev: any) => {
        ev.preventDefault(); // do not open a link
        const convertId = (cid: string | number) => (isNaN(+cid) ? cid : +cid);
        const sourceId = convertId(ev.dataTransfer.getData('text').replace(TreeItemIdPrefix, ''));
        const targetId = convertId((findId(ev.target) || '').replace(TreeItemIdPrefix, ''));
        log(`Dropping ${sourceId} on ${targetId}`);
        if (sourceId === targetId) {
          return false;
        }
        const tiSource = find(sourceId);
        const tiTarget = find(targetId);
        if (tiSource && tiTarget) {
          if (opts.onBeforeUpdate && opts.onBeforeUpdate(tiSource, 'move', tiTarget) === false) {
            return false;
          }
          deleteTreeItem(sourceId);
          tiSource[parentId] = tiTarget[id];
          if (!tiTarget[children]) {
            tiTarget[children] = [];
          }
          tiTarget[children].push(tiSource);
          if (isOpen) {
            tiTarget[isOpen] = true;
          }
          if (opts.onUpdate) {
            opts.onUpdate(tiSource, 'move', tiTarget);
          }
        } else if (tiSource) {
          if (opts.onBeforeUpdate && opts.onBeforeUpdate(tiSource, 'move', state.tree) === false) {
            return false;
          }
          deleteTreeItem(sourceId);
          tiSource[parentId] = undefined;
          state.tree.push(tiSource);
          if (opts.onUpdate) {
            opts.onUpdate(tiSource, 'move', state.tree);
          }
        }
      },
      ondragover: (ev: any) => {
        const sourceId = state.dragId;
        const targetId = findId(ev.target) || '';
        ev.redraw = false;
        if (sourceId !== targetId) {
          ev.preventDefault();
        }
      },
      ondragstart: (ev: DragEvent) => {
        const target = ev.target;
        (ev as any).redraw = false;
        if (target) {
          ev.dataTransfer.setData('text', (target as any).id);
          ev.dataTransfer.effectAllowed = 'move';
          state.dragId = (target as any).id;
        }
        log('Drag start: ' + ev.dataTransfer.getData('text'));
      },
    } as Attributes;

    return {
      dragOptions: dragOpts,
      options: {
        ...opts,
        treeItemView,
        onSelect,
        onCreate,
        onDelete,
        onUpdate,
        _find: find,
        _button: button,
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
    view: vnode => {
      state.tree = vnode.attrs.tree;
      return m(
        `.tree-container[draggable=${options.editable.canUpdate}]`,
        { ...dragOptions },
        m('ul', [
          ...state.tree.map(item => m(TreeItem, { item, options, dragOptions, state, key: item[options.id] })),
          m(
            'li',
            m(
              '.tree-item.clickable',
              options.editable.canCreate && options.multipleRoots
                ? m('.indent', m(options._button('create'), { onclick: () => options._createItem() }))
                : ''
            )
          ),
        ])
      );
    },
  } as Component<{ tree: T; options?: Partial<ITreeOptions> }>;
};
