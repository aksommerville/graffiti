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
      room.backgroundImageUrl = imageUrl;
      resolve(imageUrl);
    });
    request.on("error", (error) => {
      console.log(`HTTP ERROR!`, error);
      reject(error);
    });
    request.end();
  });
}

/* Create room.
 *************************************************/
 
function createRoom(userId) {
  const room = store.addEntity("room", {
    ownerUserId: userId,
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
 
//TODO i guess we do want to keep users in the room entity, to cause it to update on anyone's join/leave
 
function joinRoom(sessionId, roomId) {
  const session = store.getEntity("session", sessionId);
  const room = store.getEntity("room", roomId);
  if (!session || !room) return null;
  if (session.roomId) return null;
  return store.updateEntity("session", sessionId, {
    roomId: roomId,
  });
}

function leaveRoom(sessionId, roomId) {
  const session = store.getEntity("session", sessionId);
  if (!session) return null;
  if (session.roomId !== roomId) return null;
  return store.updateEntity("session", sessionId, {
    roomId: null,
  });
}

/* TOC
 *************************************************/
 
module.exports = {
  fetchBackgroundImage,
  createRoom, // (userId) => room
  updateRoomFromJsonText, // (roomId, text, userId) => room
  
  // Joining and leaving take care of the session and all.
  joinRoom, // (sessionId, roomId) => room
  leaveRoom, // (sessionId, roomId)
  
  userMayEditRoom,
};
