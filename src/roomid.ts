import { Token } from '@lumino/coreutils';

export const IRoomIdManager = new Token<IRoomIdManager>(
  'jupyter-webrtc-provider:IRoomIdManager'
);

export type IRoomIdManager = {
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
  } | null;
};

export const DEFAULT_ROOM_ID_MANAGER: IRoomIdManager = {
  getRoomId: (format: string, contentType: string, path: string) =>
    `${format}:${contentType}:${path}`,
  parseRoomId: (roomId: string) => {
    const split = roomId.split(':');

    if (split.length !== 3) {
      return null;
    }

    return {
      format: split[0],
      contentType: split[1],
      path: split[2]
    };
  }
};
