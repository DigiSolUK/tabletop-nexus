import { randomUUID } from 'node:crypto';
import type {
  HostRoomRequest,
  JoinRoomRequest,
  PartyChatRequest,
  PartyReadyRequest,
  PartyRoom,
  PartyRoomPlayer,
  PartySettingsRequest,
} from '../../shared/contracts';

const inviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export class PartyRoomService {
  private readonly rooms = new Map<string, PartyRoom>();

  hostRoom(request: HostRoomRequest): PartyRoom {
    const hostId = randomUUID();
    const room: PartyRoom = {
      code: inviteCode(),
      hostId,
      createdAt: new Date().toISOString(),
      players: [{ id: hostId, name: request.hostName, ready: true, isHost: true }],
      chat: [
        {
          id: randomUUID(),
          playerId: 'system',
          playerName: 'TableTop Nexus',
          message: 'Room created. Share the invite code to bring players into the lobby.',
          createdAt: new Date().toISOString(),
        },
      ],
      settings: {
        privateRoom: true,
        maxPlayers: 6,
        currentGameId: request.currentGameId,
        rotation: [request.currentGameId],
      },
    };
    this.rooms.set(room.code, room);
    return room;
  }

  joinRoom(request: JoinRoomRequest): PartyRoom {
    const room = this.requireRoom(request.code);
    const player: PartyRoomPlayer = {
      id: randomUUID(),
      name: request.playerName,
      ready: false,
      isHost: false,
    };
    room.players = [...room.players, player].slice(0, room.settings.maxPlayers);
    room.chat = [
      ...room.chat,
      {
        id: randomUUID(),
        playerId: 'system',
        playerName: 'TableTop Nexus',
        message: `${player.name} joined the room.`,
        createdAt: new Date().toISOString(),
      },
    ];
    this.rooms.set(room.code, room);
    return room;
  }

  leaveRoom(code: string, playerId: string): PartyRoom | null {
    const room = this.requireRoom(code);
    room.players = room.players.filter((player) => player.id !== playerId);
    if (room.players.length === 0) {
      this.rooms.delete(code);
      return null;
    }
    if (!room.players.some((player) => player.id === room.hostId)) {
      room.players[0] = { ...room.players[0], isHost: true };
      room.hostId = room.players[0].id;
    }
    this.rooms.set(code, room);
    return room;
  }

  toggleReady(request: PartyReadyRequest): PartyRoom {
    const room = this.requireRoom(request.code);
    room.players = room.players.map((player) =>
      player.id === request.playerId ? { ...player, ready: !player.ready } : player
    );
    this.rooms.set(room.code, room);
    return room;
  }

  sendChat(request: PartyChatRequest): PartyRoom {
    const room = this.requireRoom(request.code);
    const player = room.players.find((item) => item.id === request.playerId);
    if (!player) {
      throw new Error('Player not found.');
    }
    room.chat = [
      ...room.chat,
      {
        id: randomUUID(),
        playerId: player.id,
        playerName: player.name,
        message: request.message,
        createdAt: new Date().toISOString(),
      },
    ];
    this.rooms.set(room.code, room);
    return room;
  }

  updateSettings(request: PartySettingsRequest): PartyRoom {
    const room = this.requireRoom(request.code);
    if (room.hostId !== request.playerId) {
      throw new Error('Only the host can update room settings.');
    }
    room.settings = { ...room.settings, ...request.patch };
    this.rooms.set(room.code, room);
    return room;
  }

  private requireRoom(code: string): PartyRoom {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new Error('Room not found.');
    }
    return room;
  }
}
