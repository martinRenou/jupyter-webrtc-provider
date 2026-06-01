import { Token } from '@lumino/coreutils';

export const IRoomIdFactory = new Token<IRoomIdFactory>(
  'jupyter-webrtc-provider:IRoomIdFactory'
);

export type IRoomIdFactory = {
  /**
   * Compute the roomId given the format, contentType and path
   * @param format
   * @param contentType
   * @param path
   */
  getRoomId(format: string, contentType: string, path: string): string;

  /**
   * Get the format, contentType and path from the roomID
   * @param roomId the room id
   */
  parseRoomId(roomId: string): {
    format: string;
    contentType: string;
    path: string;
  };
};

export const DEFAULT_ROOM_ID_FACTORY: IRoomIdFactory = {
  getRoomId: (format: string, contentType: string, path: string) =>
    `${format}:${contentType}:${path}`,
  parseRoomId: (roomId: string) => {
    const split = roomId.split(':');
    return {
      format: split[0],
      contentType: split[1],
      path: split[2]
    };
  }
};
