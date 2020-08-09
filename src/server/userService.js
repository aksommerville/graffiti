const store = require("./store.js");
const storeSession = require("./storeSession.js");
const storeUser = require("./storeUser.js");

/* Check authentication for existing session.
 *******************************************************************/

function authenticateRequest(request) {
  const authorization = request.headers["authorization"];
  if (!authorization) return null;
  const [authMethod, accessToken] = authorization.trim().split(/\s+/);
  if (authMethod.toLowerCase() !== "bearer") return null;
  if (!accessToken) return null;
  const session = store.getEntity("session", accessToken);
  if (!session) return null;
  storeSession.touchSessionExpireTime(session.id);
  return session;
}

/* Login.
 ****************************************************************/
 
function login(name, password) {
  const user = storeUser.getUserByNameAndPassword(name, password);
  if (!user) return null;
  let session = storeSession.getSessionForUserId(user.id);
  if (session) return null; // Not sure about this... User attempts login but already logged in. Smells fishy.
  
  session = store.addEntity("session", {
    ...storeSession.schema.newEntity(),
    userId: user.id,
  });
  if (!session) return null;
  
  return session;
}

/* Login to new account.
 *****************************************************************/
 
function createAccount(name, password) {
  let user = storeUser.getUserByName(name);
  if (user) return null;
  const userId = store.generateUniqueId();
  user = store.addEntity("user", {
    id: userId,
    name: name,
    hash: password ? storeUser.hashPassword(userId, password) : null,
  });
  if (!user) return null;
  let session = storeSession.getSessionForUserId(user.id);
  if (session) return null; // how is that possible???
  
  session = store.addEntity("session", {
    ...storeSession.schema.newEntity(),
    userId: userId,
  });
  if (!session) {
    store.removeEntity("user", userId);
    return null;
  }
  
  return session;
}

/* Kick out everyone in a given room.
 * Presumably because the room was deleted.
 *****************************************************************/
 
function unjoinAllForRoomId(roomId) {
  for (const session of store.getEntitiesOfType("session")) {
    if (session.roomId !== roomId) continue;
    store.updateEntity("session", session.id, {
      roomId: null,
    });
  }
}

/* TOC
 *****************************************************************/

module.exports = {
  authenticateRequest,
  login, // (name,password) => session
  createAccount, // (name,password) => session
  unjoinAllForRoomId, // (roomId)
};
