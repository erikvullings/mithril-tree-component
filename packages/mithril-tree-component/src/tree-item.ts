import m, { FactoryComponent, Attributes } from 'mithril';
import { ITreeItem } from './models';
import { IInternalTreeOptions } from './models/tree-options';
import { TreeButton } from '.';

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
      console.warn(`Selected id: ${selectedId} of item ${item.title}`);
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
      return m(`li[id=${TreeItemIdPrefix}${item[id]}][draggable=${options.editable.canUpdate}]`, dragOptions, [
        m(
          '.tree-item',
          {
            onclick: (ev: MouseEvent) => {
              ev.stopPropagation();
              onSelect(item, selectedId !== item[id]);
            },
          },
          [
            m(
              '.tree-item-header.clearfix',
              {
                class: `${selectedId === item[id] ? 'active' : ''}`,
              },
              [
                m(TreeButton, {
                  buttonName: _hasChildren(item)
                    ? (isOpen && item[isOpen]) || tiState.isOpen
                      ? 'expand_less'
                      : 'expand_more'
                    : 'spacer',
                  onclick: () => toggle(item),
                }),
                m(
                  'span.tree-item-title',
                  { class: `${editable.canUpdate ? 'moveable' : ''}` },
                  m(treeItemView, { treeItem: item, depth: _depth(item) })
                ),
              ],
              m('.act-group', [
                editable.canCreate && !_hasChildren(item) && _depth(item) < maxDepth
                  ? m(TreeButton, { buttonName: 'add_children', onclick: () =>  {
                    _addChildren(item);
                    tiState.isOpen = true;
                  } })
                  : '',
                editable.canDelete && (editable.canDeleteParent || !_hasChildren(item))
                  ? m(TreeButton, { buttonName: 'delete', onclick: () => onDelete(item) })
                  : '',
              ])
            ),
            _isExpanded(item, tiState.isOpen)
              ? m('ul.tree-item-body', [
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
                        m(
                          '.indent',
                          m(TreeButton, { buttonName: 'create', onclick: () => _createItem(item[id]) })
                        )
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
