import type { SSEStreamingApi } from 'hono/streaming';

import { randomUUID } from 'node:crypto';
import { omit } from 'radash';

interface ClipboardPayload {
  type: 'text' | 'rtf' | 'html' | 'image' | 'files';
  value: string;
  search: string;
  // 当 type = files | image 时, 存在该值
  blobs?: Blob[];
  // 当blobs存在时，计算大小
  size?: number;
}

type RoomId = string;

class ServerSentEvent {
  private roomMap: {
    [roomId: RoomId]:
      | {
        roomId: RoomId;
        data?: {
          id: string;
          uploadAt: number;
          payload: ClipboardPayload;
        };
        clients: {
          clientId: string;
          clientName: string;
          stream: SSEStreamingApi;
        }[];
      }
      | undefined;
  } = {};

  private clientMap: { [clientId: string]: RoomId } = {};

  public getClientOpenData(roomId: string, lastEventId?: string) {
    // 第一次连接， 或者没有该用户组的记录
    if (!lastEventId || !this.roomMap[roomId]) {
      return { id: randomUUID(), data: 'hello' };
    }

    const data = this.roomMap[roomId].data;
    // 还没有同步数据
    if (!data) {
      return { id: randomUUID(), data: 'hello' };
    }

    // 重连后上一次的数据已经收到
    if (data.id === lastEventId) {
      return { id: randomUUID(), data: 'hello' };
    }

    // 上次同步的数据超过5秒了，即数据已经失效
    if (Date.now() > data.uploadAt + 5 * 1000) {
      return { id: randomUUID(), data: 'hello' };
    }

    return { id: lastEventId, data: JSON.stringify(this.roomMap[roomId].data) };
  }

  public getLatestClipboardPayload(
    roomId: string,
  ): ClipboardPayload | undefined {
    return this.roomMap[roomId]?.data?.payload;
  }

  public getClients(roomId: string) {
    return (
      this.roomMap[roomId]?.clients.map(({ clientId, clientName }) => {
        return { clientId, clientName };
      }) ?? []
    );
  }

  public joinRoom({
    clientId,
    clientName,
    roomId,
    stream,
  }: {
    clientId: string;
    clientName: string;
    roomId: string;
    stream: SSEStreamingApi;
  }) {
    if (!stream && this.clientMap[clientId] === roomId) {
      return;
    }

    this.leaveRoom(clientId);
    this.clientMap[clientId] = roomId;

    this.bindRoom({ roomId, clientId, clientName, stream });
  }

  public leaveRoom(clientId: string) {
    const roomId = this.clientMap[clientId];
    if (!roomId) {
      return;
    }

    if (!this.roomMap[roomId]) {
      return;
    }

    this.roomMap[roomId].clients = this.roomMap[roomId].clients.filter(
      ({ clientId: v }) => {
        return v !== clientId;
      },
    );
  }

  public broadcase(
    clientId: string,
    roomId: string,
    payload: ClipboardPayload,
  ) {
    this.setRoomData(roomId, payload);

    if (!this.roomMap[roomId]) {
      return;
    }

    const { clients, data } = this.roomMap[roomId];

    if (!data) {
      return;
    }

    let sseLen = 0;
    for (const client of clients) {
      if (client.clientId === clientId) {
        logger.info('same client, skip broadcase', client.clientName);
        continue;
      }

      const payload = omit(data.payload, ['blobs']);
      logger.info('broadcase to ', client.clientName, payload);
      client.stream.writeSSE({
        id: data.id,
        data: JSON.stringify(payload),
      });
      sseLen += 1;
    }

    logger.info('success broadcase len:', sseLen);
  }

  private bindRoom({
    roomId,
    clientId,
    clientName,
    stream,
  }: {
    roomId: string;
    clientId: string;
    clientName: string;
    stream: SSEStreamingApi;
  }) {
    this.roomMap[roomId] = this.roomMap[roomId] || { roomId, clients: [] };

    logger.info(`${clientName || clientId} join room: ${roomId}`);
    this.roomMap[roomId].clients.push({ clientId, clientName, stream });

    stream.onAbort(() => {
      this.leaveRoom(clientId);

      logger.info(`${clientName || clientId} leave room: ${roomId}`);
    });
  }

  private setRoomData(roomId: string, data: ClipboardPayload) {
    this.roomMap[roomId] = this.roomMap[roomId] || { roomId, clients: [] };

    // 计算文件大小，单位M
    let size = 0;
    if (data.blobs?.length) {
      size = data.blobs.reduce((sum, { size }) => {
        return sum + size;
      }, 0);

      size = Number(
        (Math.floor((size / 1024 / 1024) * 10000) / 10000).toFixed(4),
      );
    }

    this.roomMap[roomId].data = {
      id: randomUUID(),
      uploadAt: Date.now(),
      payload: {
        ...data,
        size,
      },
    };
  }
}

const sse = new ServerSentEvent();

export { sse };
export type { ClipboardPayload };
