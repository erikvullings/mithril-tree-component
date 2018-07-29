import 'materialize-css/js/jquery.hammer';
import 'materialize-css/js/hammer.min';
import 'materialize-css/dist/css/materialize.min.css';
import 'materialize-css/dist/js/materialize.min';
import './styles.css';
import m, { RouteDefs } from 'mithril';
import { TreeView } from './components/tree-view';
import { Layout } from './components/layout';

export const M: { updateTextFields: () => void } = (window as any).Materialize;

const routingTable: RouteDefs = {
  '/': {
    render: () => m(Layout, m(TreeView)),
  },
};

m.route(document.body, '/', routingTable);
