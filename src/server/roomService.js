const store = require("./store.js");
const storeRoom = require("./storeRoom.js");
const https = require("https");

/* Fetch a new background image.
 *********************************************************/
 
function fetchBackgroundImage(width, height) {
  return new Promise((resolve, reject) => {
    const url = `https://picsum.photos/${width}/${height}`;
    const request = https.get(url, (response) => {
      if ((response.statusCode < 300) || (response.statusCode > 399)) {
        return reject(response);
      }
      const imageUrl = response.headers["location"];
      if (!imageUrl) {
        return reject("Picsum response had no redirect URL");
      }
      resolve(imageUrl);
    });
    request.on("error", (error) => {
      console.log(`HTTP ERROR!`, error);
      reject(error);
    });
    request.end();
  });
}

/* Fetch an image URL and store it in the given entity when it arrives.
 ***************************************************/
 
function acquireBackgroundImageForEntity(roomId) {
  fetchBackgroundImage(800,600).then((url) => {
    store.updateEntity("room", roomId, {
      backgroundImageUrl: url,
    });
  });
}

/* Create room.
 *************************************************/
 
function createRoom(userId) {
  const room = store.addEntity("room", {
    ...storeRoom.schema.newEntity(null),
    ownerUserId: userId,
    userIds: [userId],
  });
  return room;
}

/* Parse an update request, confirm authz, and commit it.
 ***************************************************/
 
function updateRoomFromJsonText(roomId, text, userId) {
  const original = store.getEntity("room", roomId);
  if (!original) return null;
  if (!userMayEditRoom(userId, original)) return null;
  const incoming = JSON.parse(text);
  return store.updateEntity("room", roomId, incoming);
}

/* Access control.
 **************************************************/
 
function userMayEditRoom(userId, room) {
  if (room.ownerUserId === userId) return true;
  if (room.permitAnyEdit) return true;
  return false;
}

/* Join and leave.
 *****************************************************/
 
function joinRoom(sessionId, roomId) {
  const session = store.getEntity("session", sessionId);
  let room = store.getEntity("room", roomId);
  if (!session || !room) return null;
  if (session.roomId) return null;
  if (!(room=store.updateEntity("room", roomId, {
    userIds: [...room.userIds, session.userId],
  }))) return null;
  if (!store.updateEntity("session", sessionId, {
    roomId: roomId,
  })) return null;
  return room;
}

function leaveRoom(sessionId, roomId) {
  const session = store.getEntity("session", sessionId);
  if (!session) return null;
  if (session.roomId !== roomId) return null;
  
  const room = store.getEntity("room", roomId);
  if (!room) return null;
  store.updateEntity("room", roomId, {
    userIds: room.userIds.filter(id => id !== session.userId),
  });
  
  return store.updateEntity("session", sessionId, {
    roomId: null,
  });
}

/* Accept uploaded image improvments.
 ***************************************************/
 
function registerImprovement(roomId, userId, serial) {
  const room = store.getEntity("room", roomId);
  if (!room) return null;
  if (room.userIds.indexOf(userId) < 0) return null;
  
  // Switching from "play" to "conclude" state is our job.
  let state = room.state;
  if (state === "play") {
    const usersNowAccountedFor = Object.keys(room.improvements);
    if (usersNowAccountedFor.indexOf(userId) < 0) {
      usersNowAccountedFor.push(userId);
    }
    if (usersNowAccountedFor.length === room.userIds.length) {
      state = "conclude";
    }
  }
  
  return store.updateEntity("room", roomId, {
    improvements: {
      ...room.improvements,
      [userId]: serial,
    },
    state,
  });
}

/* TOC
 *************************************************/
 
module.exports = {
  fetchBackgroundImage,
  createRoom, // (userId) => room
  updateRoomFromJsonText, // (roomId, text, userId) => room
  acquireBackgroundImageForEntity, // (roomId)
  
  // Joining and leaving take care of the session and all.
  joinRoom, // (sessionId, roomId) => room
  leaveRoom, // (sessionId, roomId)
  
  userMayEditRoom,
  
  registerImprovement, // (roomId, userId, serial)
};
