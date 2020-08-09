/* Session {
 *   userId
 *   expireTime: ms
 *   roomId // null if not joined
 *   roomListener
 *   changes: [{
 *     type
 *     entity
 *   }]
 *   pendingPoll: [request,response] or null
 * }
 * Session ID is the "accessToken" at the business layer.
 */
 
const store = require("./store.js");
const respond = require("./respond.js");
 
const SESSION_EXPIRE_TIME_MS = 1000 * 60 * 20;
 
/* New entity.
 *********************************************************/
 
function newEntity(id) {
  return {
    id,
    userId: "",
    expireTime: Date.now() + SESSION_EXPIRE_TIME_MS,
    roomId: null,
    roomListener: 0,
    changes: [],
    pendingPoll: null,
  };
}

/* Cleanup
 *********************************************************/
 
function cleanupEntity(session) {
  if (session.roomListener) {
    store.unlisten(session.roomListener);
  }
}

/* Validate.
 ********************************************************/
 
function validateEntity(session) {
  return true;
}

/* Queue changes for async delivery.
 ******************************************************/
 
function roomChanged(sessionId, room) {
  const session = store.getEntity("session", sessionId);
  if (!session) return;
  
  const existingIndex = session.changes.findIndex(c => c.entity.id === room.id);
  if (existingIndex >= 0) {
    session.changes.splice(existingIndex, 1);
  }
  
  session.changes.push({
    type: "room",
    entity: {...room},
  });
  
  if (session.pendingPoll) {
    respond.serveJson(session.pendingPoll[0], session.pendingPoll[1], session.changes);
    store.updateEntity("session", sessionId, {
      pendingPoll: null,
      changes: [],
    });
  }
}

/* Apply changes.
 *******************************************************/
 
function applyChanges(original, incoming) {
  let modified = {...original};
  let reallyChanged = false;
  if (incoming.userId && (modified.userId !== incoming.userId)) {
    if (modified.userId) {
      throw new Error(`Can't change session's userId once set`);
    }
    if (getSessionForUserId(incoming.userId)) {
      throw new Error(`User '${incoming.userId}' already has an active session`);
    }
    modified.userId = incoming.userId;
    reallyChanged = true;
  }
  if (incoming.expireTime && (modified.expireTime !== incoming.expireTime)) {
    modified.expireTime = incoming.expireTime;
    reallyChanged = true;
  }
  
  if (incoming.changes && (modified.changes !== incoming.changes)) {
    if (modified.changes.length !== incoming.changes.length) {
      modified.changes = incoming.changes;
      reallyChanged = true;
    } else {
      for (let i=incoming.changes.length; i-->0; ) {
        const a = modified.changes[i];
        const b = incoming.changes[i];
        if ((a.type !== b.type) || (a.entity.id !== b.entity.id)) {
          modified.changes = incoming.changes;
          reallyChanged = true;
          break;
        }
      }
    }
  }
  
  if ((incoming.roomId !== undefined) && (modified.roomId !== incoming.roomId)) {
    modified.roomId = incoming.roomId;
    reallyChanged = true;
    if (modified.roomListener) {
      store.unlisten(modified.roomListener);
    }
    if (incoming.roomId) {
      if (incoming.roomListener) {
        modified.roomListener = incoming.roomListener;
      } else {
        modified.roomListener = store.listen("room", modified.roomId, (room) => roomChanged(modified.id, room));
      }
    } else if (incoming.roomListener) {
      store.unlisten(incoming.roomListener);
    }
  }
  
  return reallyChanged ? modified : original;
}

/* Return an array of IDs of all expired sessions.
 ********************************************************/
 
function getExpiredSessionIds() {
  const now = Date.now();
  const ids = [];
  for (const session of store.getEntitiesOfType("session")) {
    if (session.expireTime <= now) {
      ids.push(session.id);
    }
  }
  return ids;
}

/* Refresh session expiry.
 **********************************************************/
 
function touchSessionExpireTime(id) {
  return store.updateEntity("session", id, {
    expireTime: Date.now() + SESSION_EXPIRE_TIME_MS,
  });
}

/* Get session for user id.
 ******************************************************/
 
function getSessionForUserId(userId) {
  for (const session of store.getEntitiesOfType("session")) {
    if (session.userId === userId) return session;
  }
  return null;
}

/* TOC
 *********************************************************/

module.exports = {
  name: "session",
  schema: {
    newEntity,
    validateEntity,
    applyChanges,
    cleanupEntity,
  },
  getExpiredSessionIds, // () => [string...]
  touchSessionExpireTime, // (id) => session
  getSessionForUserId,
};
