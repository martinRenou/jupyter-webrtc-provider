import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import {
  awarenessProviderFactoryPlugin,
  documentProviderFactoryPlugin
} from './provider';

const plugins: JupyterFrontEndPlugin<unknown>[] = [
  documentProviderFactoryPlugin,
  awarenessProviderFactoryPlugin
];

export default plugins;
