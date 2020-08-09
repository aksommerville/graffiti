const http = require("http");
const https = require("https");
const userService = require("./userService.js");
const roomService = require("./roomService.js");
const store = require("./store.js");
const respond = require("./respond.js");

const serverInterface = process.env["INTF"] || "localhost";
const serverPort = +(process.env["PORT"] || "8080");
const htdocsDir = process.env["HTDOCS"];

const storeRoom = require("./storeRoom.js");
const storeUser = require("./storeUser.js");
const storeSession = require("./storeSession.js");
store.init([
  storeRoom,
  storeUser,
  storeSession,
]);

/* Remote-control diagnostics.
 ********************************************************************/
 
function serveSelfTest(request, response) {

  console.log("**** PERFORMING SELF TEST PER REQUEST ****");
  
  const storeContent = store.examineFullContent();

  console.log("All users (permanent list):");
  for (const user of storeContent.user) {
    console.log(`  ${user.id} '${user.name}'`);
  }
  console.log("Currently logged in:");
  for (const session of storeContent.session) {
    console.log(`  ${session.id} '${session.name}' ${session.expire}`);
  }
  
  console.log("Rooms:");
  for (const room of storeContent.room) {
    console.log(`  ${JSON.stringify(room)}`);
  }
  
  console.log("**** END OF SELF TEST ****");

  // Don't tell the user that this service exists.
  respond.serveError(request, response, 404);
}

/* /api/player
 *******************************************************************/
 
function serveLogin(request, response) {
  const name = request.urlObject.searchParams.get("name");
  const password = request.body;
  if (!name || !password) return respond.serveError(request, response, {
    statusCode: 400,
    statusMessage: "name and password required",
  });
  const session = userService.login(name, password);
  if (!session) return respond.serveError(request, response, {
    statusCode: 400,
    statusMessage: "login failed",
  });
  respond.serveJson(request, response, {
    accessToken: session.id,
    userId: session.userId,
  });
}

function serveNewPlayer(request, response) {
  const name = request.urlObject.searchParams.get("name");
  const password = request.body;
  const session = userService.createAccount(name, password);
  if (!session) return respond.serveError(request, response, {
    statusCode: 400,
    statusMessage: "Failed to create new user",
  });
  respond.serveJson(request, response, {
    accessToken: session.id,
    userId: session.userId,
  });
}

function serveDeletePlayer(request, response) {
  const sessionId = request.session.id;
  const userId = request.session.userId;
  store.removeEntity("session", sessionId);
  store.removeEntity("user", userId); // XXX If we're to scale this up, we must not delete user ids (must "retire" them or something)
  respond.serveVoid(request, response);
}

function serveLogout(request, response) {
  const sessionId = request.session.id;
  store.removeEntity("session", sessionId);
  respond.serveVoid(request, response);
}

function serveUpdatePlayer(request, response) {
  const userId = request.session.userId;
  const name = request.urlObject.searchParams.get("name");
  let user;
  if (name) {
    user = store.updateEntity("user", userId, {
      name,
    });
  } else {
    user = store.getEntity("user", userId);
  }
  if (!user) return respond.serveError(request, response, 500);
  respond.serveJson(request, response, {
    id: user.id,
    name: user.name,
  });
}

function servePasswordChange(request, response) {
  let oldPassword, newPassword;
  try {
    const body = JSON.parse(request.body);
    oldPassword = body["old"] || "";
    newPassword = body["new"] || "";
    const user = storeUser.changePassword(userId, oldPassword, newPassword);
    if (!user) throw null;
  } catch (e) {
    return respond.serveError(request, response, {
      statusCode: 400,
      statusMessage: "Failed to change password",
    });
  }
  respond.serveVoid(request, response);
}

/* /api/room
 ****************************************************************/
 
function serveNewRoom(request, response) {
  const userId = request.session.userId;
  const sessionId = request.session.id;
  if (request.session.roomId) {
    return respond.serveError(request, response, {
      statusCode: 400,
      statusMessage: "Can't create a room while joined to another",
    });
  }
  const room = roomService.createRoom(userId);
  if (!room) return respond.serveError(request, response, 500);
  const session = store.updateEntity("session", sessionId, {
    roomId: room.id,
  });
  if (!session) return respond.serveError(request, response, 500);
  return respond.serveJson(request, response, room);
}
 
function serveGetRoom(request, response) {
  const roomId = request.urlObject.searchParams.get("id") || request.session.roomId;
  if (!roomId) return respond.serveError(request, response, {
    statusCode: 400,
    statusMessage: "id required",
  });
  const room = store.getEntity("room", roomId);
  if (!room) return respond.serveError(request, response, 404);
  respond.serveJson(request, response, room);
}
 
function serveUpdateRoom(request, response) {
  const roomId = request.urlObject.searchParams.get("id") || request.session.roomId;
  if (!roomId) return respond.serveError(request, response, {
    statusCode: 400,
    statusMessage: "id required",
  });
  const room = roomService.updateRoomFromJsonText(roomId, request.body, userId);
  if (!room) return respond.serveError(request, response, {
    statusCode: 401,
    statusMessage: "Failed to update room",
  });
  respond.serveJson(request, response, room);
}
 
function serveDeleteRoom(request, response) {
  const userId = request.session.userId;
  const roomId = request.urlObject.searchParams.get("id") || request.session.roomId;
  if (!roomId) return respond.serveError(request, response, {
    statusCode: 400,
    statusMessage: "id required",
  });
  const room = store.getEntity("room", roomId);
  if (!room) return respond.serveError(request, response, 404);
  if (!roomService.userMayEditRoom(userId, room)) return respond.serveError(request, response, {
    statusCode: 401,
    statusMessage: "Access denied",
  });
  store.removeEntity("room", roomId);
  userService.unjoinAllForRoomId(roomId);
  respond.serveVoid(request, response);
}
 
function serveJoinRoom(request, response) {
  const sessionId = request.session.id;
  const roomId = request.urlObject.searchParams.get("id");
  if (!roomId) return respond.serveError(request, response, {
    statusCode: 400,
    statusMessage: "id required",
  });
  if (request.session.roomId) return respond.serveError(request, response, {
    statusCode: 400,
    statusMessage: "Can't join two rooms at once",
  });
  const room = roomService.joinRoom(sessionId, roomId);
  if (!room) return respond.serveError(request, response, 404);
  respond.serveJson(request, response, room);
}
 
function serveLeaveRoom(request, response) {
  const sessionId = request.session.id;
  const roomId = request.session.roomId;
  if (!roomId) return respond.serveVoid(request, response);
  roomService.leaveRoom(sessionId, roomId);
  respond.serveVoid(request, response, room);
}

/* Poll service.
 **************************************************************/
 
function servePoll(request, response) {

  if (request.session.pendingPoll) return respond.serveError(request, response, {
    statusCode: 400,
    statusMessage: "Already polling",
  });
  
  // If any changes are queued, deliver and drop them now.
  if (request.session.changes.length) {
    console.log("*** Sending changes immediately ***");
    const changes = [...request.session.changes];
    store.updateEntity("session", request.session.id, {
      changes: [],
    });
    return respond.serveJson(request, response, changes);
  }
  
  console.log("*** Waiting for changes ***");
  if (!(store.updateEntity("session", request.session.id, {
    pendingPoll: [request, response],
  }))) return respond.serveError(request, response, 500);
}

/* REST dispatch.
 ******************************************************************/

function serveApi(request, response) {
  const url = new URL(`http://example.com${request.url}`);
  request.urlObject = url;
  const endpointName = `${request.method} ${url.pathname}`;
  
  /* Unathenticated calls.
   */
  switch (endpointName) {
  
    case "GET /api/time": return respond.serveText(request, response, new Date().toISOString());
    case "GET /api/selftest": return serveSelfTest(request, response);
    case "POST /api/player/login": return serveLogin(request, response);
    case "POST /api/player/new": return serveNewPlayer(request, response);
  
  }
  
  /* Authenticated calls.
   */
  const session = userService.authenticateRequest(request);
  if (!session) return respond.serveError(request, response, 401);
  request.session = session;
  switch (endpointName) {
  
    case "DELETE /api/player": return serveDeletePlayer(request, response);
    case "POST /api/player/logout": return serveLogout(request, response);
    case "POST /api/player/update": return serveUpdatePlayer(request, response);
    case "POST /api/player/password": return servePasswordChange(request, response);
    case "POST /api/room/new": return serveNewRoom(request, response);
    case "GET /api/room": return serveGetRoom(request, response);
    case "DELETE /api/room": return serveDeleteRoom(request, response);
    case "PUT /api/room": return serveUpdateRoom(request, response);
    case "POST /api/room/join": return serveJoinRoom(request, response);
    case "POST /api/room/leave": return serveLeaveRoom(request, response);
    case "GET /api/poll": return servePoll(request, response);
  
  }
  respond.serveError(request, response, 404);
}

/* Service dispatch.
 ******************************************************************/

function serve(request, response) {
  try {
  
    if (request.url === "/") request.url = "/index.html";
    
    if (request.url.startsWith("/api/")) {
      return serveApi(request, response);
    }
    
    if (htdocsDir) {
      return respond.serveStaticFile(request, response, htdocsDir);
    }
    
    respond.serveError(request, response, 404);
    
  } catch (e) {
    console.error(e);
    respond.serveError(request, response, e);
  }
}

const server = http.createServer();
server.listen(serverPort, serverInterface, (error) => {
  if (error) {
    console.error(error);
  } else {
    console.log(`Serving on ${serverInterface}:${serverPort}.`);
    if (htdocsDir) {
      console.log(`Serving static files from '${htdocsDir}'.`);
    } else {
      console.log(`Will not serve static files due to HTDOCS unset.`);
    }
    server.on("request", (request, response) => {
      let body = "";
      request.on("data", (data) => (body += data));
      request.on("end", () => {
        request.body = body;
        serve(request, response);
      });
    });
  }
});

setInterval(() => {
  userService.dropExpiredSessions();
}, 1000 * 60);
