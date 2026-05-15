import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import { webSocketFactoryPlugin } from './websocket';
import {
  awarenessProviderFactoryPlugin,
  documentProviderFactoryPlugin
} from './provider';

const plugins: JupyterFrontEndPlugin<unknown>[] = [
  webSocketFactoryPlugin,
  documentProviderFactoryPlugin,
  awarenessProviderFactoryPlugin
];

export default plugins;
