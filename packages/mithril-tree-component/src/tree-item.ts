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
  const tiState = {
    isOpen: false,
  } as {
    isOpen: boolean;
    open: (treeItem: ITreeItem, isExpanded: boolean) => void;
    toggle: (treeItem: ITreeItem) => void;
  };

  return {
    oninit: ({ attrs }) => {
      const { options } = attrs;
      const { isOpen, _hasChildren } = options;

      tiState.toggle = (treeItem: ITreeItem) => {
        if (_hasChildren(treeItem)) {
          if (isOpen) {
            treeItem[isOpen] = !treeItem[isOpen];
          } else {
            tiState.isOpen = !tiState.isOpen;
          }
        }
      };
      tiState.open = (treeItem: ITreeItem, isExpanded: boolean) => {
        if (isExpanded) {
          return;
        }
        if (isOpen) {
          treeItem[isOpen] = true;
        } else if (!tiState.isOpen) {
          tiState.isOpen = true;
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
        onDelete,
        editable: { canUpdate, canCreate, canDelete, canDeleteParent },
        maxDepth,
      } = options;
      const { toggle, open, isOpen } = tiState;
      const isExpanded = _isExpanded(item, isOpen);
      const hasChildren = _hasChildren(item);
      const depth = _depth(item);
      return m(`li[id=${TreeItemIdPrefix}${item[id]}][draggable=${canUpdate}]`, dragOptions, [
        m(
          '.mtc__item',
          {
            onclick: (ev: MouseEvent) => {
              ev.stopPropagation();
              onSelect(item, selectedId !== item[id]);
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
                      onclick: () => toggle(item),
                    })
                  : undefined,
                m(
                  '.mtc__item-title',
                  {
                    class: `${canUpdate ? 'mtc__moveable' : ''} ${hasChildren ? '' : 'mtc__childless-item'}`,
                    style: `max-width: ${width - 64 - 12 * depth}px`,
                  },
                  m(treeItemView, { treeItem: item, depth, width })
                ),
              ],
              m('.mtc__act-group', [
                canDelete && (canDeleteParent || !hasChildren)
                  ? m(TreeButton, { buttonName: 'delete', onclick: () => onDelete(item) })
                  : '',
                canCreate && depth < maxDepth
                  ? m(TreeButton, {
                      buttonName: 'add_child',
                      onclick: () => {
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
                      width,
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
      ]);
    },
  };
};
