import { ServerConnection, User } from '@jupyterlab/services';

import { IAwareness } from '@jupyter/ydoc';

import { WebrtcProvider } from './webrtc';

export interface IContent {
  type: string;
  body: string;
}

/**
 * A class to provide Yjs synchronization over WebRTC.
 *
 */
export class WebRTCAwarenessProvider extends WebrtcProvider {
  /**
   * Construct a new WebRTCAwarenessProvider
   *
   * @param options The instantiation options for a WebRTCAwarenessProvider
   */
  constructor(options: WebRTCAwarenessProvider.IOptions) {
    super(options.roomID, options.awareness.doc, {
      signaling: options.signalingServers,
      awareness: options.awareness
    });
    this.awareness = options.awareness;
    this._user = options.user;
    this._user.ready
      .then(() => this._onUserChanged(this._user))
      .catch(e => console.error(e));
    this._user.userChanged.connect(this._onUserChanged, this);
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._user.userChanged.disconnect(this._onUserChanged, this);
    this._isDisposed = true;
    this.destroy();
  }

  private _onUserChanged(user: User.IManager): void {
    this.awareness.setLocalStateField('user', user.identity);
  }

  readonly awareness: IAwareness;
  private _isDisposed = false;
  private _user: User.IManager;
}

/**
 * A namespace for WebRTCAwarenessProvider statics.
 */
export namespace WebRTCAwarenessProvider {
  /**
   * The instantiation options for a WebRTCAwarenessProvider.
   */
  export interface IOptions {
    /**
     * The room ID
     */
    roomID: string;

    /**
     * The awareness object
     */
    awareness: IAwareness;

    /**
     * The user data
     */
    user: User.IManager;

    /**
     * The server settings.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The signaling server URLs for WebRTC.
     */
    signalingServers: string[];
  }
}
