import m, { FactoryComponent, Attributes } from 'mithril';
import { TreeItem, TreeItemIdPrefix } from './tree-item';
import { IInternalTreeOptions } from './models/tree-options';
import { ITreeItem, ITreeOptions, TreeItemUpdateAction } from './models';
import { uuid4, TreeButton } from './utils';
import { ITreeState } from './models/tree-state';

export let log: (...args: any[]) => void = () => undefined;

export const TreeContainer: FactoryComponent<{ tree: ITreeItem[]; options: Partial<ITreeOptions> }> = () => {
  const state = {
    selectedId: '',
    dragId: '',
  } as ITreeState;

  const setDefaultOptions = (options: Partial<ITreeOptions>) => {
    // const { options } = state;
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
    const opts = {
      id: 'id',
      parentId: 'parentId',
      children: 'children',
      name: 'name',
      isOpen: 'isOpen',
      maxDepth: Number.MAX_SAFE_INTEGER,
      multipleRoots: true,
      logging: false,
      editable: { canCreate: false, canDelete: false, canUpdate: false, canDeleteParent: false },
      ...options,
    } as IInternalTreeOptions;

    if (opts.logging) {
      log = console.log;
    }
    const { id, parentId, name, children, isOpen } = opts;

    /** Recursively find a tree item */
    const find = (tId: string | number = '', partialTree = state.tree) => {
      if (!tId || !partialTree) {
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
    const deleteTreeItem = (tId: string | number = '', partialTree = state.tree) => {
      if (!tId || !partialTree) {
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

    /** Recursively update a tree item and all its children */
    const updateTreeItem = (updatedTreeItem: ITreeItem, partialTree = state.tree) => {
      if (!partialTree) {
        return false;
      }
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
        } else if (state.tree) {
          state.tree.push(ti);
        }
      },
      opts.onBeforeCreate,
      opts.onCreate
    );

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
      onCreate(create());
    };

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

    const treeItemView = opts.treeItemView || {
      view: ({ attrs: { treeItem } }) => treeItem[name],
    };

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
          if (opts.onBeforeUpdate && opts.onBeforeUpdate(tiSource, 'move', tiTarget) === false) {
            return false;
          }
          deleteTreeItem(sourceId);
          tiSource[parentId] = undefined;
          if (state.tree) {
            state.tree.push(tiSource);
          }
          if (opts.onUpdate) {
            opts.onUpdate(tiSource, 'move', tiTarget);
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
        if (target && ev.dataTransfer) {
          ev.dataTransfer.setData('text', (target as any).id);
          ev.dataTransfer.effectAllowed = 'move';
          state.dragId = (target as any).id;
          log('Drag start: ' + ev.dataTransfer.getData('text'));
        }
      },
    } as Attributes;

    const hasChildren = (treeItem: ITreeItem) => treeItem[children] && treeItem[children].length;

    const addChildren = (treeItem: ITreeItem) => {
      if (!hasChildren(treeItem)) {
        treeItem[children] = [];
        if (isOpen) {
          treeItem[isOpen] = true;
        }
        createTreeItem(treeItem[id]);
      }
    };

    const isExpanded = (treeItem: ITreeItem, isOpened: boolean) =>
      hasChildren(treeItem) && ((isOpen && treeItem[isOpen]) || isOpened);

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
        _deleteItem: deleteTreeItem,
        _createItem: createTreeItem,
        _hasChildren: hasChildren,
        _addChildren: addChildren,
        _depth: depth,
        _isExpanded: isExpanded,
      } as IInternalTreeOptions,
    };
  };

  /** Find the ID of the first parent element. */
  const findId = (el: HTMLElement): string | null =>
    el.id ? el.id : el.parentElement ? findId(el.parentElement) : null;

  return {
    oninit: ({ attrs }) => {
      const { options, dragOptions } = setDefaultOptions(attrs.options);
      state.options = options;
      state.dragOptions = dragOptions;
    },
    view: ({ attrs }) => {
      state.tree = attrs.tree;
      const { options, dragOptions } = state;
      if (!state.tree || !options || !dragOptions) {
        return undefined;
      }
      return m(
        `.tree-container[draggable=${options.editable.canUpdate}]`,
        { ...dragOptions },
        m('ul', [
          ...state.tree.map(item =>
            m(TreeItem, {
              item,
              options,
              dragOptions,
              selectedId: state.selectedId,
              key: item[options.id],
            })
          ),
          m(
            'li',
            m(
              '.tree-item.clickable',
              options.editable.canCreate && options.multipleRoots
                ? m('.indent', m(TreeButton, { buttonName: 'create', onclick: () => options._createItem() }))
                : ''
            )
          ),
        ])
      );
    },
  };
};
