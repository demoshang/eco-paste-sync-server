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
    [roomId: RoomId]: {
      roomId: RoomId;
      data: ClipboardPayload;
      dataId: string;
      clients: {
        clientId: string;
        clientName: string;
        stream: SSEStreamingApi;
      }[];
    };
  } = {};

  private clientMap: { [clientId: string]: RoomId } = {};

  public getOpenData(roomId: string, lastEventId?: string) {
    if (!lastEventId || this.roomMap[roomId]?.dataId !== lastEventId) {
      return { id: randomUUID(), data: 'hello' };
    }

    return { id: lastEventId, data: JSON.stringify(this.roomMap[roomId].data) };
  }

  public getLatestClipboardData(roomId: string): ClipboardPayload | undefined {
    return this.roomMap[roomId]?.data;
  }

  public getClients(roomId: string) {
    return this.roomMap[roomId]?.clients.map(({ clientId, clientName }) => {
      return { clientId, clientName };
    }) ?? [];
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

  public broadcase(clientId: string, roomId: string, data: ClipboardPayload) {
    this.setRoomData(roomId, data);

    const { clients } = this.roomMap[roomId];

    let sseLen = 0;
    for (const client of clients) {
      if (client.clientId === clientId) {
        logger.info('same client, skip broadcase', client.clientName);
        continue;
      }

      const payload = omit(this.roomMap[roomId].data, ['blobs']);
      logger.info('broadcase to ', client.clientName, payload);
      client.stream.writeSSE({ id: this.roomMap[roomId].dataId, data: JSON.stringify(payload) });
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
        sum += size;
        return sum;
      }, 0);
    }
    size = Number(
      (Math.floor((size / 1024 / 1024) * 10000) / 10000).toFixed(4),
    );

    this.roomMap[roomId].data = {
      ...data,
      size,
    };
    this.roomMap[roomId].dataId = randomUUID();
  }
}

const sse = new ServerSentEvent();

export { sse };
export type { ClipboardPayload };
