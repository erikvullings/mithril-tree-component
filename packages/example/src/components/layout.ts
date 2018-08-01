import m, { Vnode } from 'mithril';

export const Layout = () => ({
  view: (vnode: Vnode) =>
    m('container', [
      m(
        'nav',
        m('.nav-wrapper', [
          m(
            'a.brand-logo',
            { style: 'margin-left: 20px' },
            m('span', { style: 'margin-top: 10px; margin-left: -10px;' }, 'MITHRIL TREE COMPONENT')
          ),
        ])
      ),
      m('section.main', vnode.children),
    ]),
});
