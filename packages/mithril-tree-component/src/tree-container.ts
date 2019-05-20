import './styles/tree-container.css';
import m, { FactoryComponent, Attributes, VnodeDOM } from 'mithril';
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
        if (opts.onCreate) {
          opts.onCreate(treeItem);
        }
      }
    );

    /** Create a new tree item. */
    const createTreeItem = (pId: string | number = '', width: number) => {
      const create = (w: number) => {
        if (options.create) {
          const parent = find(pId);
          const d = parent ? depth(parent) : -1;
          return options.create(parent, d, w);
        }
        const item = {} as ITreeItem;
        item[id] = uuid4();
        item[parentId] = pId;
        item[name] = 'New...';
        return item;
      };
      onCreate(create(width));
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

    /** The drop location indicates the new position of the dropped element: above, below or as a child */
    const computeDropLocation = (target: HTMLElement, ev: DragEvent) => {
      const { top, height } = target.getBoundingClientRect();
      const y = ev.clientY - top;
      const deltaZone = height / 3;
      return y < deltaZone ? 'above' : y < 2 * deltaZone ? 'as_child' : 'below';
    };

    const convertId = (cid: string | number) => (isNaN(+cid) ? cid : +cid);

    const dndTreeItems = (target: HTMLElement, ev: DragEvent) => {
      if (ev.dataTransfer) {
        const sourceId = convertId(state.dragId || ev.dataTransfer.getData('text').replace(TreeItemIdPrefix, ''));
        const targetId = convertId((findId(target) || '').replace(TreeItemIdPrefix, ''));
        const tiSource = find(sourceId);
        const tiTarget = find(targetId);
        return { tiSource, tiTarget, sourceId, targetId };
      }
      return { tiSource: undefined, tiTarget: undefined, sourceId: undefined, targetId: undefined };
    };

    const isValidTarget = (
      target: HTMLElement,
      ev: DragEvent,
      dropLocation: 'above' | 'below' | 'as_child' = computeDropLocation(target, ev)
    ) => {
      const { sourceId, targetId, tiSource, tiTarget } = dndTreeItems(target, ev);
      const parent = dropLocation === 'as_child' || !tiTarget ? tiTarget : find(tiTarget[parentId]);
      return (
        targetId !== sourceId &&
        (!opts.onBeforeUpdate || (tiSource && opts.onBeforeUpdate(tiSource, 'move', parent) === true))
      );
    };

    const dragOpts = {
      ondrop: (ev: DragEvent) => {
        if (!ev.dataTransfer || !ev.target) {
          return false;
        }
        const target = ev.target as HTMLElement;
        const parent = findParent(target);
        if (!parent) {
          return;
        }
        parent.classList.remove('mtc__above', 'mtc__below', 'mtc__as_child');
        state.isDragging = false;
        ev.preventDefault(); // do not open a link
        const { sourceId, targetId, tiSource, tiTarget } = dndTreeItems(target, ev);
        const dropLocation = computeDropLocation(parent, ev);
        if (!isValidTarget(target, ev, dropLocation)) {
          return false;
        }
        log(`Dropping ${sourceId} ${dropLocation} ${targetId}`);
        if (tiSource && tiTarget) {
          tiSource[parentId] = tiTarget[dropLocation === 'as_child' ? id : parentId];
          if (state.tree) {
            const sourceIndex = state.tree && state.tree.indexOf(tiSource);
            const targetIndex = state.tree && state.tree.indexOf(tiTarget);
            const newIndex = Math.max(
              0,
              dropLocation === 'above'
                ? targetIndex - 1
                : dropLocation === 'below'
                ? targetIndex + 1
                : state.tree.length - 1
            );
            move(state.tree, sourceIndex, newIndex);
          }
          if (dropLocation === 'as_child' && isOpen) {
            tiTarget[isOpen] = true;
          }
          if (opts.onUpdate) {
            opts.onUpdate(tiSource, 'move', tiTarget);
          }
          return true;
        } else {
          return false;
        }
      },
      ondragover: (ev: DragEvent) => {
        (ev as any).redraw = false;
        const target = ev.target as HTMLElement;
        const parent = findParent(target);
        if (parent) {
          parent.classList.remove('mtc__above', 'mtc__below', 'mtc__as_child');
          const dropLocation = computeDropLocation(parent, ev);
          if (isValidTarget(target, ev, dropLocation)) {
            ev.preventDefault();
            parent.classList.add('mtc__' + dropLocation);
            target.style.cursor = isValidTarget(target, ev, dropLocation) ? 'inherit' : 'no_drop';
          }
        } else {
          target.style.cursor = 'no_drop';
        }
      },
      // ondragenter: (ev: DragEvent) => {
      //   const target = ev.target as HTMLElement;
      //   const { sourceId, targetId, tiSource, tiTarget } = dndTreeItems(target, ev);
      //   const disallowDrop =
      //     targetId === sourceId ||
      //     (tiSource && opts.onBeforeUpdate && opts.onBeforeUpdate(tiSource, 'move', tiTarget) === false);
      //   target.style.cursor = disallowDrop ? 'no-drop' : '';
      // },
      ondragleave: (ev: DragEvent) => {
        const target = ev.target as HTMLElement;
        if (target && target.style) {
          target.style.cursor = 'inherit';
        }
        const parent = findParent(target);
        if (parent) {
          parent.classList.remove('mtc__above', 'mtc__below', 'mtc__as_child');
        }
      },
      ondragstart: (ev: DragEvent) => {
        const target = ev.target;
        (ev as any).redraw = false;
        state.dragId = '';
        if (target && ev.dataTransfer) {
          state.isDragging = true;
          ev.dataTransfer.setData('text', (target as any).id);
          ev.dataTransfer.effectAllowed = 'move';
          state.dragId = (target as any).id.replace(TreeItemIdPrefix, '');
          log('Drag start: ' + ev.dataTransfer.getData('text'));
        }
      },
    } as Attributes;

    const hasChildren = (treeItem: ITreeItem) => state.tree && state.tree.some(ti => ti[parentId] === treeItem[id]);

    const addChildren = (treeItem: ITreeItem, width: number) => {
      createTreeItem(treeItem[id], width);
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
  const findId = (el: HTMLElement | null): string | null =>
    el ? (el.id ? el.id : el.parentElement ? findId(el.parentElement) : null) : null;

  /** Find the ID of the first parent element. */
  const findParent = (el: HTMLElement | null): HTMLElement | null =>
    el ? (el.id ? el : el.parentElement ? findParent(el.parentElement) : null) : null;

  const setTopWidth:
    | ((this: {}, vnode: VnodeDOM<{ tree: ITreeItem[]; options: Partial<ITreeOptions> }, {}>) => any)
    | undefined = ({ dom }) => {
    state.width = dom.clientWidth - 64;
  };

  return {
    oninit: ({ attrs: { options: treeOptions } }) => {
      const { options, dragOptions } = setDefaultOptions(treeOptions);
      state.options = options;
      state.dragOptions = dragOptions;
      state.parentId = options.parentId;
    },
    onupdate: setTopWidth,
    oncreate: setTopWidth,
    view: ({ attrs: { tree } }) => {
      state.tree = tree;
      const { options, dragOptions, parentId, width } = state;
      if (!state.tree || !options || !dragOptions) {
        return undefined;
      }
      const {
        _createItem,
        placeholder,
        editable: { canUpdate, canCreate },
        id,
        multipleRoots,
      } = options;
      const isEmpty = state.tree.length === 0;
      return m(
        '.mtc.mtc__container',
        isEmpty
          ? m(
              '.mtc__empty',
              m(
                '.mtc__act.mtc__header',
                {
                  onclick: () => _createItem(),
                },
                [m('div', '✚'), m('i', placeholder)]
              )
            )
          : m(
              `[draggable=${canUpdate}]`,
              { ...dragOptions },
              m('ul.mtc__branch', [
                ...state.tree
                  .filter(item => !item[parentId])
                  .map(item =>
                    m(TreeItem, {
                      item,
                      width,
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
            )
      );
    },
  };
};
