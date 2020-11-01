import m, { Component } from 'mithril';
import { TreeContainer, ITreeOptions, ITreeItem, uuid4, ITreeItemViewComponent } from 'mithril-tree-component';

interface IMyTree extends ITreeItem {
  id: number | string;
  parentId: number | string;
  title: string;
  description: string;
}

const isOpen = (() => {
  const store: Record<string, boolean> = {};
  return (id: string, action: 'get' | 'set', value?: boolean) => {
    if (action === 'get') {
      return store.hasOwnProperty(id) ? store[id] : false;
    } else if (typeof value !== 'undefined') {
      store[id] = value;
    }
  };
})();

export const TreeView = () => {
  let selectedId: string | number = 5;

  const data: IMyTree[] = [
    {
      id: 1,
      parentId: 0,
      title: 'My id is 1',
      description: 'Description of item 1.',
    },
    {
      id: 2,
      parentId: 1,
      title: 'My id is 2',
      description: 'Description of item 2.',
    },
    {
      id: 3,
      parentId: 1,
      title: 'My id is 3',
      description: 'Description of item 3.',
    },
    {
      id: 4,
      parentId: 2,
      title: 'I have a very long title which should be displayed using ellipses if everything works as expected',
      description: 'Description of item 4.',
    },
    {
      id: 5,
      parentId: 0,
      title: 'My id is 5 - I am not a drop target',
      description: 'Items cannot be dropped on me.',
    },
    {
      id: 6,
      parentId: 0,
      title: 'My id is 6',
      description: 'Description of item 6.',
    },
    {
      id: 7,
      parentId: 0,
      title: 'My id is 7',
      description: 'Description of item 7.',
    },
    {
      id: 8,
      parentId: 4,
      title: 'My id is 8',
      description: 'Description of item 8.',
    },
  ];
  const emptyTree: IMyTree[] = [];
  const tree = data;
  const options = {
    logging: true,
    id: 'id',
    parentId: 'parentId',
    // isOpen: "isOpen",
    isOpen,
    name: 'title',
    onToggle: (ti, isExpanded) => console.log(`On toggle: "${ti.title}" is ${isExpanded ? '' : 'not '}expanded.`),
    onSelect: (ti, isSelected) => {
      selectedId = ti.id;
      console.log(`On ${isSelected ? 'select' : 'unselect'}: ${ti.title}`);
    },
    onBeforeCreate: (ti) => console.log(`On before create ${ti.title}`),
    onCreate: (ti) => {
      console.log(`On create ${ti.title}`);
      // selectedId = ti.id;
    },
    onBeforeDelete: (ti) => console.log(`On before delete ${ti.title}`),
    onDelete: (ti) => console.log(`On delete ${ti.title}`),
    onBeforeUpdate: (ti, action, newParent) => {
      console.log(`On before ${action} update ${ti.title} to ${newParent ? newParent.title : ''}.`);
      const result = newParent && newParent.id === 5 ? false : true;
      console.warn(result ? 'Drop allowed' : 'Drop not allowed');
      return result;
    },
    onUpdate: (ti) => console.log(`On update ${ti.title}`),
    create: (parent?: IMyTree) => {
      const item = {} as IMyTree;
      item.id = uuid4();
      if (parent) {
        item.parentId = parent.id;
      }
      item.title = `Created at ${new Date().toLocaleTimeString()}`;
      return item as IMyTree;
    },
    editable: {
      canCreate: false,
      canDelete: false,
      canUpdate: false,
      canDeleteParent: false,
    },
  } as Partial<ITreeOptions>;

  const optionsCRUD = {
    ...options,
    placeholder: 'Create a new tree item',
    editable: {
      canCreate: true,
      canDelete: true,
      canUpdate: true,
      canDeleteParent: false,
    },
  };

  const optionsOwnView = {
    ...options,
    maxDepth: 3,
    treeItemView: {
      view: ({
        attrs: {
          depth,
          treeItem: { title, description },
          width,
        },
      }) =>
        m(
          'div',
          { style: `max-width: ${width - 32}px` },
          m('div', { style: 'font-weight: bold; margin-right: 1rem' }, `Depth ${depth}: ${title}`),
          m('div', { style: 'font-style: italic;' }, description || '...')
        ),
    } as Component<ITreeItemViewComponent>,
  } as ITreeOptions;

  const optionsCRUDisOpen = {
    ...options,
    isOpen: undefined,
    editable: {
      canCreate: true,
      canDelete: true,
      canUpdate: true,
      canDeleteParent: false,
    },
  } as ITreeOptions;

  const optionsAsync = {
    ...options,
    isOpen: undefined,
    editable: {
      canCreate: true,
      canDelete: true,
      canUpdate: true,
      canDeleteParent: false,
    },
    onBeforeDelete: (ti) => {
      return new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.log(`On before delete ${ti.title}`);
          resolve(true);
        }, 3000);
      });
    },
    onBeforeCreate: (ti) => {
      return new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.log(`On before create ${ti.title}`);
          resolve(true);
        }, 3000);
      });
    },
    onDelete: (ti) => {
      console.log(`On delete ${ti.title}`);
      m.redraw(); // As the delete action is done async, force a redraw when done.
    },
    onCreate: (ti) => {
      console.log(`On create ${ti.title}`);
      m.redraw(); // As the delete action is done async, force a redraw when done.
    },
  } as ITreeOptions;

  return {
    view: () => {
      // console.log('Drawing the view...');
      return m('.row', [
        m('.col.s6', [
          m('h3', 'CRUD'),
          m(TreeContainer, { tree, options: optionsCRUD, selectedId }),
          m('h3', 'Readonly'),
          m(TreeContainer, { tree, options }),
          m('h3', 'Own view, maxDepth 3'),
          m(TreeContainer, { tree, options: optionsOwnView }),
          m('h3', 'CRUD, isOpen undefined'),
          m(TreeContainer, { tree, options: optionsCRUDisOpen }),
          m('h3', 'CRUD, async. create and delete'),
          m(TreeContainer, { tree, options: optionsAsync }),
          m('h3', 'CRUD, empty tree'),
          m(TreeContainer, { tree: emptyTree, options: optionsCRUD }),
        ]),
        m('.col.s6', [
          m(
            'button.waves-effect.waves-light.btn',
            {
              onclick: () => {
                setTimeout(() => {
                  data[0].title = `Updated at ${new Date().toTimeString()}`;
                  m.redraw();
                }, 1000);
              },
            },
            'Update first node with timeout'
          ),
          m('h3', 'Tree data'),
          m('pre', m('code', JSON.stringify(tree, null, 2))),
        ]),
      ]);
    },
  };
};
