export { IWebSocketFactory } from './websocket';

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import {
  awarenessProviderFactoryPlugin,
  documentProviderFactoryPlugin,
  IRoomIdFactory
} from './provider';

export {
  awarenessProviderFactoryPlugin,
  documentProviderFactoryPlugin,
  IRoomIdFactory
};

const plugins: JupyterFrontEndPlugin<unknown>[] = [
  documentProviderFactoryPlugin,
  awarenessProviderFactoryPlugin
];

export default plugins;
