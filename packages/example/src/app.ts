import 'materialize-css/dist/css/materialize.min.css';
import './styles.css';
import m, { RouteDefs } from 'mithril';
import { TreeView } from './components/tree-view';
import { Layout } from './components/layout';

const routingTable: RouteDefs = {
  '/': {
    render: () => m(Layout, m(TreeView)),
  },
};

m.route(document.body, '/', routingTable);
