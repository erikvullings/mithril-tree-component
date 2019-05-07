import m, { FactoryComponent, Attributes } from 'mithril';
import { ITreeItem } from './models';
import { IInternalTreeOptions } from './models/tree-options';
import { TreeButton } from './utils';

export const TreeItemIdPrefix = 'tree-item-';

interface ITreeItemAttributes {
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
    },
    view: ({ attrs }) => {
      const { item, options, dragOptions, selectedId } = attrs;
      const {
        id,
        isOpen,
        treeItemView,
        _findChildren,
        _isExpanded,
        _addChildren,
        _hasChildren,
        _depth,
        _createItem,
        onSelect,
        onDelete,
        editable,
        maxDepth,
      } = options;
      const { toggle } = tiState;
      const hasChildren = _hasChildren(item);
      return m(`li[id=${TreeItemIdPrefix}${item[id]}][draggable=${options.editable.canUpdate}]`, dragOptions, [
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
                      buttonName: (isOpen && item[isOpen]) || tiState.isOpen ? 'expand_less' : 'expand_more',
                      onclick: () => toggle(item),
                    })
                  : undefined,
                m(
                  'span.mtc__item-title',
                  { class: `${editable.canUpdate ? 'mtc__moveable' : ''} ${hasChildren ? '' : 'mtc__childless-item'}` },
                  m(treeItemView, { treeItem: item, depth: _depth(item) })
                ),
              ],
              m('.mtc__act-group', [
                editable.canCreate && !_hasChildren(item) && _depth(item) < maxDepth
                  ? m(TreeButton, {
                      buttonName: 'add_children',
                      onclick: () => {
                        _addChildren(item);
                        tiState.isOpen = true;
                      },
                    })
                  : '',
                editable.canDelete && (editable.canDeleteParent || !_hasChildren(item))
                  ? m(TreeButton, { buttonName: 'delete', onclick: () => onDelete(item) })
                  : '',
              ])
            ),
            _isExpanded(item, tiState.isOpen)
              ? m('ul.mtc__item-body', [
                  // ...item[children].map((i: ITreeItem) =>
                  ..._findChildren(item).map((i: ITreeItem) =>
                    m(TreeItem, {
                      item: i,
                      options,
                      dragOptions,
                      selectedId,
                      key: i[id],
                    })
                  ),
                  options.editable.canCreate
                    ? m(
                        'li',
                        m('.mtc__indent', m(TreeButton, { buttonName: 'create', onclick: () => _createItem(item[id]) }))
                      )
                    : '',
                ])
              : '',
          ]
        ),
      ]);
    },
  };
};
