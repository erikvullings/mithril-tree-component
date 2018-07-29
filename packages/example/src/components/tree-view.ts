import m from 'mithril';
import { unflatten } from '../utils';
// import { TreeContainer } from 'mithril-tree-component';

export const TreeView = () => {
  const data = [
    { id: 1, parentId: 0, title: 'My id is 1' },
    { id: 2, parentId: 1, title: 'My id is 2' },
    { id: 3, parentId: 1, title: 'My id is 3' },
    { id: 4, parentId: 2, title: 'My id is 4' },
    { id: 5, parentId: 0, title: 'My id is 5' },
    { id: 6, parentId: 0, title: 'My id is 6' },
    { id: 7, parentId: 4, title: 'My id is 7' },
  ];
  const treeData = unflatten(data);
  return {
    view: () => m('div', [
      m('h3', 'The data'),
      m('pre', m('code', JSON.stringify(treeData, null, 2))),
      m('h3', 'Materialize example'),
      // m(TreeContainer, 'Tree 1'),
    ]),
  };
};
