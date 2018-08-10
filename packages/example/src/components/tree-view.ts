import m, { Vnode, Component } from 'mithril';
import { unflatten } from '../utils';
import { TreeContainer, ITreeOptions, ITreeItem, uuid4, ITreeItemViewComponent } from 'mithril-tree-component';

interface IMyTree extends ITreeItem {
  id: number | string;
  parentId: number | string;
  title: string;
}

export const TreeView = () => {
  const data: IMyTree[] = [
    { id: 1, parentId: 0, title: 'My id is 1', description: 'Description of item 1.' },
    { id: 2, parentId: 1, title: 'My id is 2', description: 'Description of item 2.' },
    { id: 3, parentId: 1, title: 'My id is 3', description: 'Description of item 3.' },
    { id: 4, parentId: 2, title: 'My id is 4', description: 'Description of item 4.' },
    { id: 5, parentId: 0, title: 'My id is 5', description: 'Description of item 5.' },
    { id: 6, parentId: 0, title: 'My id is 6', description: 'Description of item 6.' },
    { id: 7, parentId: 4, title: 'My id is 7', description: 'Description of item 7.' },
  ];
  const tree = unflatten(data);
  const options = {
    id: 'id',
    parentId: 'parentId',
    isOpen: 'isOpen',
    name: 'title',
    onSelect: (ti, isSelected) => console.log(`On ${isSelected ? 'select' : 'unselect'}: ${ti.title}`),
    onBeforeCreate: ti => console.log(`On before create ${ti.title}`),
    onCreate: ti => console.log(`On create ${ti.title}`),
    onBeforeDelete: ti => console.log(`On before delete ${ti.title}`),
    onDelete: ti => console.log(`On delete ${ti.title}`),
    onBeforeUpdate: (ti, action, newParent) =>
      console.log(`On before ${action} update ${ti.title} to ${newParent ? newParent.title : ''}.`),
    onUpdate: ti => console.log(`On update ${ti.title}`),
    create: (parent?: IMyTree) => {
      const item = {} as IMyTree;
      item.id = uuid4();
      if (parent) {
        item.parentId = parent.id;
      }
      item.title = `Created at ${new Date().toLocaleTimeString()}`;
      return item as ITreeItem;
    },
    editable: { canCreate: false, canDelete: false, canUpdate: false, canDeleteParent: false },
  } as ITreeOptions;

  const options2 = {
    ...options,
    editable: { canCreate: true, canDelete: true, canUpdate: true, canDeleteParent: false },
  };

  const options3 = {
    ...options,
    maxDepth: 3,
    treeItemView: {
      view: ({ attrs }: Vnode<ITreeItemViewComponent>) =>
        m(
          'div',
          { style: 'display: inline-block; vertical-align: middle; line-height: 1.5rem;' },
          m('div', { style: 'font-weight: bold;' }, `Depth ${attrs.depth}: ${attrs.treeItem.title}`),
          m('div', { style: 'font-style: italic;' }, attrs.treeItem.description || '...')
        ),
    } as Component<ITreeItemViewComponent>,
  } as ITreeOptions;

  const options4 = {
    ...options,
    isOpen: undefined,
    editable: { canCreate: true, canDelete: true, canUpdate: true, canDeleteParent: false },
  } as ITreeOptions;

  const options5 = {
    ...options,
    isOpen: undefined,
    editable: { canCreate: true, canDelete: true, canUpdate: true, canDeleteParent: false },
    onBeforeDelete: ti => {
      return new Promise<boolean>(resolve => {
        setTimeout(() => {
          console.log(`On before delete ${ti.title}`);
          resolve(true);
        }, 3000);
      });
    },
    onBeforeCreate: ti => {
      return new Promise<boolean>(resolve => {
        setTimeout(() => {
          console.log(`On before create ${ti.title}`);
          resolve(true);
        }, 3000);
      });
    },
    onDelete: ti => {
      console.log(`On delete ${ti.title}`);
      m.redraw(); // As the delete action is done async, force a redraw when done.
    },
    onCreate: ti => {
      console.log(`On create ${ti.title}`);
      m.redraw(); // As the delete action is done async, force a redraw when done.
    },
  } as ITreeOptions;

  return {
    view: () =>
      console.log('Drawing the view...') ||
      m('.row', [
        m('.col.s6', [
          m('h3', 'Readonly'),
          m(TreeContainer, { tree, options }),
          m('h3', 'CRUD'),
          m(TreeContainer, { tree, options: options2 }),
          m('h3', 'Own view, maxDepth 3'),
          m(TreeContainer, { tree, options: options3 }),
          m('h3', 'CRUD, isOpen undefined'),
          m(TreeContainer, { tree, options: options4 }),
          m('h3', 'CRUD, async. create and delete'),
          m(TreeContainer, { tree, options: options5 }),
        ]),
        m('.col.s6', [m('h3', 'Tree data'), m('pre', m('code', JSON.stringify(tree, null, 2)))]),
      ]),
  };
};
