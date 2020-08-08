const fs = require("fs");
const http = require("http");
const https = require("https");
const { guessMimeType } = require("./mime.js");
const userService = require("./userService.js");
const roomService = require("./roomService.js");

const serverInterface = process.env["INTF"] || "localhost";
const serverPort = +(process.env["PORT"] || "8080");
const htdocsDir = process.env["HTDOCS"];

// Call after response.end()
function logTransaction(request, response) {
  console.log(`${new Date().toISOString()} ${response.statusCode} ${request.method} ${request.url}`);
}

function cannedErrorMessage(statusCode) {
  switch (statusCode) {
    case 401: return "Unauthorized";
    case 403: return "Forbidden";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
    case 599: return "TODO";
  }
  switch (Math.floor(statusCode / 100)) {
    case 200: return "OK";
    case 300: return "Redirect";
    case 400: return "Client Error";
    case 500: return "Internal Server Error";
  }
  return "";
}

function serveError(request, response, error) {
  if (typeof(error) === "number") error = { statusCode: error };
  else if (!error) error = {};
  response.statusCode = error.statusCode || 500;
  response.statusMessage = error.statusMessage || cannedErrorMessage(response.statusCode);
  response.end();
  logTransaction(request, response);
}

function serveVoid(request, response) {
  response.statusCode = 200;
  response.statusMessage = "OK";
  response.end();
  logTransaction(request, response);
}

function serveText(request, response, text) {
  response.statusCode = 200;
  response.statusMessage = "OK";
  response.end(text);
  logTransaction(request, response);
}

function serveJson(request, response, object) {
  const json = JSON.stringify(object);
  response.statusCode = 200;
  response.statusMessage = "OK";
  response.end(json);
  logTransaction(request, response);
}

function serveStaticFile(request, response, root) {
  if (request.method !== "GET") {
    return serveError(request, response, 405);
  }
  fs.realpath(`${root}/${request.url}`, (error, path) => {
    if (error || !path.startsWith(root)) return serveError(request, response, {
      ...error,
      statusCode: 404,
    });
    fs.readFile(path, (error, data) => {
      if (error) return serveError(request, response, {
        ...error,
        statusCode: 404,
      });
      
      response.setHeader("Content-Type", guessMimeType(path, data));
      response.statusCode = 200;
      response.status = "OK";
      response.end(data);
      logTransaction(request, response);
    });
  });
}

/* Remote-control diagnostics.
 ********************************************************************/
 
function serveSelfTest(request, response) {

  console.log("**** PERFORMING SELF TEST PER REQUEST ****");

  const { users, sessions } = userService.getAll();
  console.log("All users (permanent list):");
  for (const user of users) {
    console.log(`  ${user.id} '${user.name}'`);
  }
  console.log("Currently logged in:");
  for (const session of sessions) {
    console.log(`  ${session.id} '${session.name}' ${session.expire}`);
  }
  
  const rooms = roomService.getAll();
  console.log("Rooms:");
  for (const room of rooms) {
    console.log(`  ${JSON.stringify(room)}`);
  }
  
  console.log("**** END OF SELF TEST ****");

  // Don't tell the user that this service exists.
  serveError(request, response, 404);
}

/* /api/player
 *******************************************************************/
 
function validateUserName(name) {
  if (!name) return false;
  return !!name.match(/^[0-9a-zA-Z_\-.]{1,12}$/);
}

function validateUserId(id) {
  if (!id) return false;
  // We can change the rules, but please do not allow '$' -- we use that to distinguish temporary ones
  return !!id.match(/^[0-9a-zA-Z_\-.]{1,12}$/);
}

function validateNewPassword(password) {
  if (!password) return false;
  if (password.length < 8) return false;
  return true;
}
 
function serveLogin(request, response) {
  const id = request.urlObject.searchParams.get("id");
  const password = request.body;
  const tokenAndName = userService.login(id, password);
  if (!tokenAndName) return serveError(request, response, 403);
  return serveJson(request, response, tokenAndName);
}

function serveNewPlayer(request, response) {
  const name = request.urlObject.searchParams.get("name");
  if (!validateUserName(name)) return serveError(request, response, {
    statusCode: 400,
    statusMessage: "Invalid user name.",
  });
  
  // (id) is optional. If present, we create a new persistent user record.
  const id = request.urlObject.searchParams.get("id");
  if (id) {
    if (!validateUserId(id)) return serveError(request, response, {
      statusCode: 400,
      statusMessage: "Invalid user id.",
    });
    const password = request.body;
    if (!validateNewPassword(password)) return serveError(request, response, {
      statusCode: 400,
      statusMessage: "Invalid password.",
    });
    if (!userService.createUser(id, password, name)) return serveError(request, response, {
      statusCode: 400,
      statusMessage: "User id already taken.",
    });
    return serveLogin(request, response);
  }
  
  // Anonymous login...
  const accessToken = userService.loginWithoutCredentials(name);
  if (!accessToken) return serveError(request, response, 500);
  return serveJson(request, response, { accessToken, name });
}

function serveDeletePlayer(request, response) {
  userService.deleteUser(request.user.id);
  return serveVoid(request, response);
}

function serveLogout(request, response) {
  userService.logout(request.user.id);
  return serveVoid(request, response);
}

/* /api/room
 ****************************************************************/
 
function serveNewRoom(request, response) {
  const room = roomService.createRoom(request.user.id);
  return serveJson(request, response, room);
}
 
function serveGetRoom(request, response) {
  const id = request.urlObject.searchParams.get("id");
  if (!id) return serveError(request, response, {
    statusCode: 400,
    statusMessage: "'id' required",
  });
  const room = roomService.getRoom(id);
  if (!roomService.roomIsVisibleToUser(room, request.user.id)) {
    return serveError(request, response, 404);
  }
  return serveJson(request, response, room);
}
 
function serveUpdateRoom(request, response) {
  const id = request.urlObject.searchParams.get("id");
  if (!id) return serveError(request, response, {
    statusCode: 400,
    statusMessage: "'id' required",
  });
  const room = roomService.getRoom(id);
  if (!room) return serveError(request, response, 404);
  if (!roomService.roomIsMutableToUser(room, request.user.id)) {
    return serveError(request, response, 403);
  }
  try {
    const incomingRoom = JSON.parse(request.body);
    const modified = roomService.modifyRoom(room, incomingRoom);
    return serveJson(request, response, modified);
  } catch (e) {
    return serveError(request, response, {
      statusCode: 400,
      statusMessage: "Invalid room changes.",
    });
  }
}
 
function serveDeleteRoom(request, response) {
  const id = request.urlObject.searchParams.get("id");
  if (!id) return serveError(request, response, {
    statusCode: 400,
    statusMessage: "'id' required",
  });
  const room = roomService.getRoom(id);
  if (!roomService.roomIsMutableToUser(room, request.user.id)) {
    return serveError(request, response, 403);
  }
  roomService.deleteRoom(room);
  return serveVoid(request, response);
}
 
function serveJoinRoom(request, response) {
  const id = request.urlObject.searchParams.get("id");
  if (!id) return serveError(request, response, {
    statusCode: 400,
    statusMessage: "'id' required",
  });
  const room = roomService.getRoom(id);
  if (!roomService.join(room, request.user.id)) {
    return serveError(request, response, 403);
  }
  return serveJson(request, response, room);
}
 
function serveLeaveRoom(request, response) {
  const room = roomService.getRoomForUserId(request.user.id);
  if (room) {
    roomService.leave(room, request.user.id);
  }
  return serveVoid(request, response);
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
  
    case "GET /api/time": return serveText(request, response, new Date().toISOString());
    case "POST /api/player/login": return serveLogin(request, response);
    case "POST /api/player/new": return serveNewPlayer(request, response);
    case "POST /api/selftest": return serveSelfTest(request, response);
  
  }
  
  /* Authenticated calls.
   */
  const user = userService.authenticateRequest(request);
  if (!user) return serveError(request, response, 401);
  request.user = user;
  switch (endpointName) {
  
    case "DELETE /api/player": return serveDeletePlayer(request, response);
    case "POST /api/player/logout": return serveLogout(request, response);
    case "POST /api/room/new": return serveNewRoom(request, response);
    case "GET /api/room": return serveGetRoom(request, response);
    case "DELETE /api/room": return serveDeleteRoom(request, response);
    case "PUT /api/room": return serveUpdateRoom(request, response);
    case "POST /api/room/join": return serveJoinRoom(request, response);
    case "POST /api/room/leave": return serveLeaveRoom(request, response);
  
  }
  serveError(request, response, 404);
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
      return serveStaticFile(request, response, htdocsDir);
    }
    
    serveError(request, response, 404);
    
  } catch (e) {
    console.error(e);
    serveError(request, response, e);
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
