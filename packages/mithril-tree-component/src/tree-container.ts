import './styles/tree-container.css';
import m, { FactoryComponent, Attributes } from 'mithril';
import { TreeItem, TreeItemIdPrefix } from './tree-item';
import { IInternalTreeOptions } from './models/tree-options';
import { ITreeItem, ITreeOptions, TreeItemUpdateAction } from './models';
import { uuid4, TreeButton, move } from './utils';
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
      name: 'name',
      isOpen: 'isOpen',
      maxDepth: Number.MAX_SAFE_INTEGER,
      multipleRoots: true,
      logging: false,
      editable: { canCreate: false, canDelete: false, canUpdate: false, canDeleteParent: false },
      placeholder: 'Create your first item',
      ...options,
    } as IInternalTreeOptions;

    if (opts.logging) {
      log = console.log;
    }
    const { id, parentId, name, isOpen } = opts;

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
        return false;
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
          findChildren(treeItem).forEach(ti => deleteTreeItem(ti[id]));
          found = true;
          return true;
        }
        return false;
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
        return false;
      });
      return found;
    };

    const depth = (treeItem: ITreeItem, curDepth = 0): number => {
      const pId = treeItem[parentId];
      return pId ? depth(find(pId) as ITreeItem, curDepth + 1) : curDepth;
    };

    const onCreate = wrapper(
      (ti: ITreeItem) => {
        if (state.tree) {
          state.tree.push(ti);
        }
      },
      opts.onBeforeCreate,
      (treeItem: ITreeItem) => {
        onSelect(treeItem, true);
        opts.onCreate(treeItem);
      }
    );

    /** Create a new tree item. */
    const createTreeItem = (pId: string | number = '') => {
      console.warn('create');
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
      (ti: ITreeItem, _: TreeItemUpdateAction = 'edit', __?: ITreeItem) => updateTreeItem(ti),
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
      ondrop: (ev: DragEvent) => {
        if (!ev.dataTransfer || !ev.target) {
          return false;
        }
        ev.preventDefault(); // do not open a link
        const convertId = (cid: string | number) => (isNaN(+cid) ? cid : +cid);
        const sourceId = convertId(ev.dataTransfer.getData('text').replace(TreeItemIdPrefix, ''));
        const targetId = convertId((findId(ev.target as HTMLElement) || '').replace(TreeItemIdPrefix, ''));
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
          tiSource[parentId] = tiTarget[id];
          if (state.tree) {
            const index = state.tree && state.tree.indexOf(tiSource);
            move(state.tree, index, state.tree.length - 1);
          }
          if (isOpen) {
            tiTarget[isOpen] = true;
          }
          if (opts.onUpdate) {
            opts.onUpdate(tiSource, 'move', tiTarget);
          }
          return true;
        } else if (tiSource) {
          if (opts.onBeforeUpdate && opts.onBeforeUpdate(tiSource, 'move', tiTarget) === false) {
            return false;
          }
          tiSource[parentId] = undefined;
          if (state.tree) {
            const index = state.tree && state.tree.indexOf(tiSource);
            move(state.tree, index, state.tree.length - 1);
          }
          if (opts.onUpdate) {
            opts.onUpdate(tiSource, 'move', tiTarget);
          }
          return true;
        } else {
          return false;
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

    const hasChildren = (treeItem: ITreeItem) => state.tree && state.tree.some(ti => ti[parentId] === treeItem[id]);

    const addChildren = (treeItem: ITreeItem) => {
      createTreeItem(treeItem[id]);
    };

    const isExpanded = (treeItem: ITreeItem, isOpened: boolean) =>
      hasChildren(treeItem) && ((isOpen && treeItem[isOpen]) || isOpened);

    const findChildren = (treeItem: ITreeItem) =>
      state.tree ? state.tree.filter(ti => ti[parentId] === treeItem[id]) : [];

    return {
      dragOptions: dragOpts,
      options: {
        ...opts,
        treeItemView,
        onSelect,
        onCreate,
        onDelete,
        onUpdate,
        _findChildren: findChildren,
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
    oninit: ({ attrs: { options: treeOptions } }) => {
      const { options, dragOptions } = setDefaultOptions(treeOptions);
      state.options = options;
      state.dragOptions = dragOptions;
      state.parentId = options.parentId;
    },
    view: ({ attrs: { tree } }) => {
      state.tree = tree;
      const { options, dragOptions, parentId } = state;
      if (!state.tree || !options || !dragOptions) {
        return undefined;
      }
      const { _createItem, placeholder, editable: { canUpdate, canCreate }, id, multipleRoots } = options;
      const isEmpty = state.tree.length === 0;
      return isEmpty
        ? m(
            '.mtc.mtc__empty',
            m(
              'span.mtc__act.mtc__header',
              {
                onclick: () => _createItem(),
              },
              [m('span', '✚'), m('i', placeholder)]
            )
          )
        : m(
            `.mtc[draggable=${canUpdate}]`,
            { ...dragOptions },
            m('ul.mtc__branch', [
              ...state.tree
                .filter(item => !item[parentId])
                .map(item =>
                  m(TreeItem, {
                    item,
                    options,
                    dragOptions,
                    selectedId: state.selectedId,
                    key: item[id],
                  })
                ),
              canCreate && multipleRoots
                ? m(
                    'li.mtc__new_root',
                    m(
                      '.mtc__item.mtc__clickable',
                      m('.mtc__indent', m(TreeButton, { buttonName: 'create', onclick: () => _createItem() }))
                    )
                  )
                : undefined,
            ])
          );
    },
  };
};
