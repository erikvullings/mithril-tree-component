import m, { FactoryComponent, Attributes } from 'mithril';
import { ITreeItem } from './models';
import { IInternalTreeOptions } from './models/tree-options';
import { TreeButton } from './utils';

export const TreeItemIdPrefix = 'tree-item-';

interface ITreeItemAttributes {
  width: number;
  item: ITreeItem;
  options: IInternalTreeOptions;
  selectedId?: string | number;
  dragOptions: Attributes;
}

export const TreeItem: FactoryComponent<ITreeItemAttributes> = () => {
  const tiState = {} as {
    open: (treeItem: ITreeItem, isExpanded: boolean) => void;
    toggle: (treeItem: ITreeItem, onToggle?: (treeItem: ITreeItem, isExpanded: boolean) => void) => void;
  };

  return {
    oninit: ({ attrs }) => {
      const { options } = attrs;
      const { isOpen = 'isOpen', id, _hasChildren } = options;

      tiState.toggle = (treeItem: ITreeItem, onToggle?: (treeItem: ITreeItem, isExpanded: boolean) => void) => {
        if (_hasChildren(treeItem)) {
          if (typeof isOpen === 'function') {
            isOpen(treeItem[id], 'set', !isOpen(treeItem[id], 'get'));
          } else {
            treeItem[isOpen] = !treeItem[isOpen];
          }
          onToggle && onToggle(treeItem, typeof isOpen === 'function' ? isOpen(treeItem[id], 'get') : treeItem[isOpen]);
        }
      };
      tiState.open = (treeItem: ITreeItem, isExpanded: boolean) => {
        if (isExpanded) {
          return;
        }
        if (typeof isOpen === 'function') {
          isOpen(treeItem[id], 'set', true);
        } else {
          treeItem[isOpen] = true;
        }
      };
    },
    view: ({ attrs: { item, options, dragOptions, selectedId, width } }) => {
      const {
        id,
        treeItemView,
        _findChildren,
        _isExpanded,
        _addChildren,
        _hasChildren,
        _depth,
        onSelect,
        onToggle,
        onDelete,
        editable: { canUpdate, canCreate, canDelete, canDeleteParent },
        maxDepth,
      } = options;
      const { toggle, open } = tiState;
      const isExpanded = _isExpanded(item);
      const hasChildren = _hasChildren(item);
      const depth = _depth(item);
      return m(
        `li${canUpdate ? '.mtc__draggable' : ''}[id=${TreeItemIdPrefix}${item[id]}][draggable=${canUpdate}]`,
        dragOptions,
        [
          m(
            '.mtc__item',
            {
              onclick: (ev: MouseEvent) => {
                ev.stopPropagation();
                selectedId !== item[id] && onSelect(item, true);
              },
            },
            [
              m(
                '.mtc__header.mtc__clearfix',
                {
                  class: `${selectedId === item[id] ? 'active' : ''}`,
                },
                [
                  hasChildren
                    ? m(TreeButton, {
                        buttonName: isExpanded ? 'expand_less' : 'expand_more',
                        onclick: () => toggle(item, onToggle),
                      })
                    : undefined,
                  m(
                    '.mtc__item-title',
                    {
                      class: `${canUpdate ? 'mtc__moveable' : ''} ${hasChildren ? '' : 'mtc__childless-item'}`,
                      style: `max-width: ${width}px`,
                    },
                    m(treeItemView, { treeItem: item, depth, width })
                  ),
                ],
                m('.mtc__act-group', [
                  canDelete && (canDeleteParent || !hasChildren)
                    ? m(TreeButton, {
                        buttonName: 'delete',
                        onclick: () => onDelete(item),
                      })
                    : '',
                  canCreate && depth < maxDepth
                    ? m(TreeButton, {
                        buttonName: 'add_child',
                        onclick: (ev: MouseEvent) => {
                          ev.stopPropagation();
                          _addChildren(item, width);
                          open(item, isExpanded);
                        },
                      })
                    : '',
                ])
              ),
              isExpanded
                ? m('ul.mtc__item-body', [
                    // ...item[children].map((i: ITreeItem) =>
                    ..._findChildren(item).map((i: ITreeItem) =>
                      m(TreeItem, {
                        width: width - 12,
                        item: i,
                        options,
                        dragOptions,
                        selectedId,
                        key: i[id],
                      })
                    ),
                  ])
                : '',
            ]
          ),
        ]
      );
    },
  };
};
