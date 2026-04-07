import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopAPI } from './shared/desktop-api';

const createInvoker = <TArgs extends unknown[], TResult>(channel: string) => {
  return (...args: TArgs) => ipcRenderer.invoke(channel, ...args) as Promise<TResult>;
};

const desktopAPI: DesktopAPI = {
  bootstrap: createInvoker<[], Awaited<ReturnType<DesktopAPI['bootstrap']>>>('desktop:bootstrap'),
  saveSettings: createInvoker<[Parameters<DesktopAPI['saveSettings']>[0]], Awaited<ReturnType<DesktopAPI['saveSettings']>>>(
    'desktop:saveSettings'
  ),
  saveProfile: createInvoker<[Parameters<DesktopAPI['saveProfile']>[0]], Awaited<ReturnType<DesktopAPI['saveProfile']>>>(
    'desktop:saveProfile'
  ),
  listProfiles: createInvoker<[], Awaited<ReturnType<DesktopAPI['listProfiles']>>>('desktop:listProfiles'),
  switchProfile: createInvoker<[string], Awaited<ReturnType<DesktopAPI['switchProfile']>>>('desktop:switchProfile'),
  beginAuth: createInvoker<
    [Parameters<DesktopAPI['beginAuth']>[0]],
    Awaited<ReturnType<DesktopAPI['beginAuth']>>
  >('desktop:beginAuth'),
  completeAuth: createInvoker<[string], Awaited<ReturnType<DesktopAPI['completeAuth']>>>('desktop:completeAuth'),
  signOut: createInvoker<[], Awaited<ReturnType<DesktopAPI['signOut']>>>('desktop:signOut'),
  syncNow: createInvoker<[], Awaited<ReturnType<DesktopAPI['syncNow']>>>('desktop:syncNow'),
  uploadAvatar: createInvoker<[], Awaited<ReturnType<DesktopAPI['uploadAvatar']>>>('desktop:uploadAvatar'),
  getActiveMatch: createInvoker<[], Awaited<ReturnType<DesktopAPI['getActiveMatch']>>>('desktop:getActiveMatch'),
  saveActiveMatch: createInvoker<
    [Parameters<DesktopAPI['saveActiveMatch']>[0]],
    Awaited<ReturnType<DesktopAPI['saveActiveMatch']>>
  >('desktop:saveActiveMatch'),
  clearActiveMatch: createInvoker<[], Awaited<ReturnType<DesktopAPI['clearActiveMatch']>>>('desktop:clearActiveMatch'),
  saveSnapshot: createInvoker<[Parameters<DesktopAPI['saveSnapshot']>[0]], Awaited<ReturnType<DesktopAPI['saveSnapshot']>>>(
    'desktop:saveSnapshot'
  ),
  deleteSave: createInvoker<[string], void>('desktop:deleteSave'),
  recordMatch: createInvoker<[Parameters<DesktopAPI['recordMatch']>[0]], void>('desktop:recordMatch'),
  markTutorialSeen: createInvoker<[string], string[]>('desktop:markTutorialSeen'),
  exportStats: createInvoker<[Parameters<DesktopAPI['exportStats']>[0]], Awaited<ReturnType<DesktopAPI['exportStats']>>>(
    'desktop:exportStats'
  ),
  importPackage: createInvoker<[], Awaited<ReturnType<DesktopAPI['importPackage']>>>('desktop:importPackage'),
  createCustomPackage: createInvoker<
    [Parameters<DesktopAPI['createCustomPackage']>[0]],
    Awaited<ReturnType<DesktopAPI['createCustomPackage']>>
  >('desktop:createCustomPackage'),
  setModEnabled: createInvoker<[string, boolean], Awaited<ReturnType<DesktopAPI['setModEnabled']>>>(
    'desktop:setModEnabled'
  ),
  hostRoom: createInvoker<[Parameters<DesktopAPI['hostRoom']>[0]], Awaited<ReturnType<DesktopAPI['hostRoom']>>>(
    'desktop:hostRoom'
  ),
  joinRoom: createInvoker<[Parameters<DesktopAPI['joinRoom']>[0]], Awaited<ReturnType<DesktopAPI['joinRoom']>>>(
    'desktop:joinRoom'
  ),
  leaveRoom: createInvoker<[string, string], Awaited<ReturnType<DesktopAPI['leaveRoom']>>>('desktop:leaveRoom'),
  toggleReady: createInvoker<
    [Parameters<DesktopAPI['toggleReady']>[0]],
    Awaited<ReturnType<DesktopAPI['toggleReady']>>
  >('desktop:toggleReady'),
  sendPartyChat: createInvoker<
    [Parameters<DesktopAPI['sendPartyChat']>[0]],
    Awaited<ReturnType<DesktopAPI['sendPartyChat']>>
  >('desktop:sendPartyChat'),
  updatePartySettings: createInvoker<
    [Parameters<DesktopAPI['updatePartySettings']>[0]],
    Awaited<ReturnType<DesktopAPI['updatePartySettings']>>
  >('desktop:updatePartySettings'),
};

contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
