import m, { FactoryComponent, Attributes } from 'mithril';
import { TreeItemAction } from '..';

/**
 * Create a GUID
 * @see https://stackoverflow.com/a/2117523/319711
 *
 * @returns RFC4122 version 4 compliant GUID
 */
export const uuid4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // tslint:disable-next-line:no-bitwise
    const r = (Math.random() * 16) | 0;
    // tslint:disable-next-line:no-bitwise
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/** Move an item in an array from index to another index */
export const move = <T>(arr: T[], from: number, to: number) => arr
  ? arr.splice(to, 0, arr.splice(from, 1)[0])
  : undefined;

export interface ITreeButtonOptions extends Attributes {
  buttonName: TreeItemAction;
}

export const TreeButton: FactoryComponent<ITreeButtonOptions> = () => {
  const textSymbol = (buttonName: TreeItemAction) => {
    switch (buttonName) {
      case 'add_children':
      case 'create':
        return '✚';
      case 'delete':
        return '✖';
      case 'expand_more':
        return '▶';
      case 'expand_less':
        return '◢';
    }
  };
  const classNames = (buttonName: TreeItemAction) => {
    switch (buttonName) {
      case 'expand_more':
      case 'expand_less':
        return 'span.mtc__clickable.mtc__collapse-expand-item';
      default:
        return '.mtc__act';
    }
  };
  return {
    view: ({ attrs: { buttonName, ...params } }) => m(`${classNames(buttonName)}`, params, textSymbol(buttonName)),
  };
};
