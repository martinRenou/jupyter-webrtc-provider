import {
  IAwarenessProviderFactory,
  IDocumentProviderFactory
} from '@jupyter/docprovider';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { IDocumentProvider } from '@jupyter/collaborative-drive';
import { ServerConnection, User, Contents } from '@jupyterlab/services';

import { PromiseDelegate } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';

import { DocumentChange, YDocument } from '@jupyter/ydoc';

import { Awareness } from 'y-protocols/awareness';
import { WebrtcProvider as YWebrtcProvider } from './webrtc';

import { IForkProvider } from '@jupyter/docprovider';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { IWebSocketFactory } from './websocket';

import { WebRTCAwarenessProvider } from './awareness';

const PLUGIN_ID = 'jupyter-webrtc-provider';
const signalingServerUrls = PageConfig.getOption('signalingServers');
const signalingServers = signalingServerUrls
  ? JSON.parse(signalingServerUrls)
  : ['https://flyio-signaling-server.fly.dev'];

/**
 * A class to provide Yjs synchronization over WebRTC.
 *
 */
export class WebRTCProvider implements IDocumentProvider, IForkProvider {
  /**
   * Construct a new WebRTCProvider
   *
   * @param options The instantiation options for a WebRTCProvider
   */
  constructor(options: WebRTCProvider.IOptions) {
    this._isDisposed = false;
    this._path = options.path;
    this._contentType = options.contentType;
    this._format = options.format;
    this._sharedModel = options.model;
    this._awareness = options.model.awareness;
    this._webrtcProvider = null;
    this._signalingServers = options.signalingServers;
    this._drive = options.drive;
    this._webSocketFactory = options.webSocketFactory;
    const user = options.user;

    user.ready
      .then(() => {
        this._onUserChanged(user);
      })
      .catch(e => console.error(e));
    user.userChanged.connect(this._onUserChanged, this);

    this._connect().catch(e => console.warn(e));
  }

  /**
   * Test whether the object has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A promise that resolves when the document provider is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }
  get contentType(): string {
    return this._contentType;
  }

  get format(): string {
    return this._format;
  }

  /**
   * Dispose of the resources held by the object.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._webrtcProvider?.off('synced', this._onSynced);
    this._webrtcProvider?.destroy();
    this._disconnect();
    Signal.clearData(this);
  }

  async reconnect(): Promise<void> {
    this._disconnect();
    this._connect();
  }

  private async _connect(): Promise<void> {
    this._webrtcProvider = new YWebrtcProvider(
      `${this._format}:${this._contentType}:${this._path}`,
      this._sharedModel.ydoc,
      {
        signaling: this._signalingServers,
        awareness: this._awareness,
        webSocketFactory: this._webSocketFactory,
        loadDocument: async (
          _format: string,
          contentType: string,
          path: string
        ) => {
          const model = await this._drive.get(path, { content: true });
          if (model.content === undefined) {
            return;
          }
          try {
            this._sharedModel.source = model.content;
          } catch (e) {
            console.error('Failed to load file content:', e);
          }

          // Mark document as not dirty after loading
          const state = this._sharedModel.ydoc.getMap('state');
          state.set('dirty', false);
        }
      }
    );

    this._webrtcProvider.on('synced', this._onSynced);
    this._webrtcProvider.on('firstClient', () => {
      this._ready.resolve();
    });
  }

  async connectToForkDoc(forkRoomId: string, sessionId: string): Promise<void> {
    this._disconnect();
    this._webrtcProvider = new YWebrtcProvider(
      forkRoomId,
      this._sharedModel.ydoc,
      {
        signaling: this._signalingServers,
        awareness: this._awareness,
        webSocketFactory: this._webSocketFactory
      }
    );
    this._webrtcProvider.on('synced', this._onSynced);
  }

  async save(): Promise<void> {
    const content = this._sharedModel.source;
    const model = await this._drive.save(this._path, {
      content,
      format: this._format as Contents.FileFormat,
      type: this._contentType
    });
    // Update the hash from the server response and clear dirty flag
    const state = this._sharedModel.ydoc.getMap('state');
    state.set('hash', model.hash);
    state.set('dirty', false);
  }

  private _disconnect(): void {
    this._webrtcProvider?.off('synced', this._onSynced);
    this._webrtcProvider?.destroy();
    this._webrtcProvider = null;
  }

  private _onUserChanged(user: User.IManager): void {
    this._awareness.setLocalStateField('user', user.identity);
  }

  private _onSynced = (event: any) => {
    if (this._webrtcProvider) {
      this._webrtcProvider.off('synced', this._onSynced);

      const state = this._sharedModel.ydoc.getMap('state');
      state.set('document_id', this._webrtcProvider.roomName);
    }
    this._ready.resolve();
  };

  private _awareness: Awareness;
  private _contentType: string;
  private _format: string;
  private _isDisposed: boolean;
  private _path: string;
  private _ready = new PromiseDelegate<void>();
  private _sharedModel: YDocument<DocumentChange>;
  private _webrtcProvider: YWebrtcProvider | null;
  private _signalingServers: string[];
  private _drive: Contents.IDrive;
  private _webSocketFactory: IWebSocketFactory;
}

/**
 * A namespace for WebRTCProvider statics.
 */
export namespace WebRTCProvider {
  /**
   * The instantiation options for a WebRTCProvider.
   */
  export interface IOptions {
    /**
     * The document file path
     */
    path: string;

    /**
     * Content type
     */
    contentType: string;

    /**
     * The source format
     */
    format: string;

    /**
     * The shared model
     */
    model: YDocument<DocumentChange>;

    /**
     * The user data
     */
    user: User.IManager;

    /**
     * The jupyterlab translator
     */
    translator: TranslationBundle;

    /**
     * The server settings.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The signaling server URLs for WebRTC.
     */
    signalingServers: string[];

    /**
     * The drive to use for loading and saving document content.
     */
    drive: Contents.IDrive;

    /**
     * Factory function to create WebSocket connections.
     */
    webSocketFactory: IWebSocketFactory;
  }
}

function getAbsoluteUrls(
  signalingServers: string[],
  serverSettings?: ServerConnection.ISettings
): string[] {
  const _serverSettings = serverSettings ?? ServerConnection.makeSettings();
  const absoluteSignalingServers: string[] = [];
  signalingServers.forEach((url: string) => {
    if (
      url.startsWith('ws://') ||
      url.startsWith('wss://') ||
      url.startsWith('http://') ||
      url.startsWith('https://')
    ) {
      // It's an absolute URL, keep it as-is.
      absoluteSignalingServers.push(url);
    } else {
      // It's a Jupyter server relative URL, build the absolute URL.
      absoluteSignalingServers.push(URLExt.join(_serverSettings.wsUrl, url));
    }
  });
  return absoluteSignalingServers;
}

/**
 * Document provider factory that creates WebSocket providers.
 */
class WebRTCDocumentProviderFactory implements IDocumentProviderFactory {
  constructor(
    private _trans: TranslationBundle,
    private _webSocketFactory: IWebSocketFactory
  ) {}

  create(options: IDocumentProviderFactory.IOptions) {
    const absoluteSignalingServers = getAbsoluteUrls(
      signalingServers,
      options.serverSettings
    );
    return new WebRTCProvider({
      signalingServers: absoluteSignalingServers,
      path: options.path,
      contentType: options.contentType,
      format: options.format,
      model: options.model,
      user: options.user,
      translator: this._trans,
      serverSettings: options.serverSettings,
      drive: options.drive,
      webSocketFactory: this._webSocketFactory
    });
  }
}

/**
 * Awareness provider factory that creates WebSocket awareness providers.
 */
class WebRTCAwarenessProviderFactory implements IAwarenessProviderFactory {
  constructor(private _webSocketFactory: IWebSocketFactory) {}

  create(options: IAwarenessProviderFactory.IOptions) {
    const absoluteSignalingServers = getAbsoluteUrls(
      signalingServers,
      options.serverSettings
    );
    return new WebRTCAwarenessProvider({
      signalingServers: absoluteSignalingServers,
      roomID: options.roomID,
      awareness: options.awareness,
      user: options.user,
      webSocketFactory: this._webSocketFactory
    });
  }
}

/**
 * Plugin that provides the WebRTC document provider factory.
 */
export const documentProviderFactoryPlugin: JupyterFrontEndPlugin<IDocumentProviderFactory> =
  {
    id: PLUGIN_ID + '-document-factory',
    description: 'Provides a WebRTC document provider factory.',
    requires: [ITranslator, IWebSocketFactory],
    optional: [],
    provides: IDocumentProviderFactory,
    activate: async (
      app: JupyterFrontEnd,
      translator: ITranslator,
      webSocketFactory: IWebSocketFactory
    ) => {
      const trans = translator.load('jupyter_collaboration');
      return new WebRTCDocumentProviderFactory(trans, webSocketFactory);
    }
  };

/**
 * Plugin that provides the WebRTC awareness provider factory.
 */
export const awarenessProviderFactoryPlugin: JupyterFrontEndPlugin<IAwarenessProviderFactory> =
  {
    id: PLUGIN_ID + '-awareness-factory',
    description: 'Provides a WebRTC awareness provider factory.',
    requires: [IWebSocketFactory],
    optional: [],
    provides: IAwarenessProviderFactory,
    activate: async (
      app: JupyterFrontEnd,
      webSocketFactory: IWebSocketFactory
    ) => {
      return new WebRTCAwarenessProviderFactory(webSocketFactory);
    }
  };
