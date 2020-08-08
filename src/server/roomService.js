const userService = require("./userService.js");

/* Globals
 ***************************************************/

/*
Room {
  id: string
  players: Player[]
  state: "gather" | "play" | "conclude" | "cancel"
  startTime: ms
  endTime: ms
  permitObservation: boolean // can players see this room's content without joining?
  openToPublic: boolean // can everybody join? (for now this is mandatory)
  ownerId: string // user id
  permitMutation: boolean
}
 */
const rooms = [];

/* Create room.
 ***************************************************/
 
function choose(options) {
  return options[Math.floor(Math.random() * options.length)];
}
 
function generateRandomRoomId() {
  const adjectives = [
    "Awesomest", "MostFabulous", "MostMagnificent", "Funnest",
    "Best", "Wackiest", "Silliest",
  ];
  const nouns = [
    "Room", "Game", "Team", "Crew", "Bunch",
  ];
  const qualifiers = [
    "Ever", "InTown", "OnEarth", "Anywhere", "IKnow",
  ];
  let id = `The${choose(adjectives)}${choose(nouns)}${choose(qualifiers)}`;
  let seq = '';
  while (rooms.find(r => r.id === `${id}${seq}`)) seq++; // (seq++) believe it or not :)
  return `${id}${seq}`;
}
 
function createRoom(ownerId) {
  const id = generateRandomRoomId();
  const room = {
    id,
    ownerId,
    players: [],
    state: "gather",
    startTime: null,
    endTime: null,
    permitObservation: true,
    openToPublic: true,
    permitMutation: false,
  };
  rooms.push(room);
  return room;
}

/* Get room by id.
 **************************************************/
 
function getRoom(id) {
  return rooms.find(r => r.id === id);
}

/* Test access.
 ***************************************************/
 
function roomIsVisibleToUser(room, userId) {
  if (!room) return false;
  if (room.permitObservation) return true;
  if (room.ownerId === userId) return true;
  if (room.players.find(p => p.id === userId)) return true;
  return false;
}

function roomIsMutableToUser(room, userId) {
  if (!room) return false;
  if (room.ownerId === userId) return true;
  if (!room.permitMutation) return false;
  if (roomIsVisibleToUser(room, userId)) return true;
  return false;
}

function roomIsJoinableToUser(room, userId) {
  if (!room) return false;
  if (room.ownerId === userId) return true;
  if (room.openToPublic) return true;
  return false;
}

/* Modify room.
 **************************************************/
 
function modifyRoom(original, incoming) {
  const fail = () => { throw new Error("invalid room modification"); };

  if (!original || !incoming) fail();
  
  if (incoming.hasOwnProperty("id")) {
    // Not allowed to modify (id)
    if (original.id !== incoming.id) fail();
  }
  
  if (incoming.hasOwnProperty("ownerId")) {
    // Not allowed to modify (ownerId)
    if (original.ownerId !== room.ownerId) fail();
  }
  
  if (incoming.hasOwnProperty("players")) {
    // Not allowed to modify (players)
    if (original.players.length !== incoming.players.length) fail();
    for (const player of incoming.players) {
      const oplayer = original.players.find(p => p.id === player.id);
      if (!oplayer || (oplayer.name !== player.name)) fail();
    }
  }
  
  if (incoming.hasOwnProperty("state") && (incoming.state !== original.state)) {
    switch (incoming.state) {
      case "gather": if (original.state !== "conclude") fail(); break;
      case "play": if (original.state !== "gather") fail(); break;
      case "conclude": break;
      case "cancel": break;
      default: fail();
    }
    original.state = incoming.state;
  }
  
  if (incoming.hasOwnProperty("startTime") && (incoming.startTime !== original.startTime)) {
    if (typeof(incoming.startTime) !== "number") fail();
    original.startTime = incoming.startTime;
  }
  
  if (incoming.hasOwnProperty("endTime") && (incoming.endTime !== original.endTime)) {
    if (typeof(incoming.endTime) !== "number") fail();
    original.endTime = incoming.endTime;
  }
  
  if (incoming.hasOwnProperty("permitObservation")) {
    if (typeof(incoming.permitObservation) !== "boolean") fail();
    room.permitObservation = incoming.permitObservation;
  }
  
  if (incoming.hasOwnProperty("openToPublic")) {
    if (typeof(incoming.openToPublic) !== "boolean") fail();
    room.openToPublic = incoming.openToPublic;
  }
  
  if (incoming.hasOwnProperty("permitMutation")) {
    if (typeof(incoming.permitMutation) !== "boolean") fail();
    room.permitMutation = incoming.permitMutation;
  }
  
  return room;
}

/* Delete room.
 ****************************************************/
 
function deleteRoom(room) {
  const index = rooms.indexOf(room);
  if (index < 0) return;
  rooms.splice(index, 1);
}

/* Join user to room.
 ******************************************************/
 
function join(room, userId) {
  if (!room) return false;
  if (!userId) return false;
  if (rooms.indexOf(room) < 0) return false; // not a real room
  if (room.players.find(p => p.id === userId)) return true; // already joined
  if (!roomIsJoinableToUser(room, userId)) return false;
  const user = userService.getLoggedInUserDetails(userId);
  if (!user) return false;
  room.players.push({
    id: user.id,
    name: user.name,
  });
  return true;
}

/* Remove user from room.
 **************************************************/
 
function leave(room, userId) {
  if (!room || !userId) return;
  const index = room.players.findIndex(p => p.id === userId);
  if (index >= 0) {
    room.players.splice(index, 1);
  }
}

/* Get all rooms.
 ***************************************************/
 
function getAll() {
  return rooms.map(room => ({
    ...room,
    players: [...room.players],
  }));
}

/* TOC
 *************************************************/
 
module.exports = {
  createRoom,
  getRoom,
  roomIsVisibleToUser,
  roomIsMutableToUser,
  modifyRoom,
  deleteRoom,
  join,
  leave,
  getAll,
};
