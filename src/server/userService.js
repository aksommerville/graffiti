const crypto = require("crypto");

/* Globals
 *******************************************************************/

const SESSION_EXPIRE_TIME_MS = 1000 * 60 * 20;

/* Persistent user list. (TODO db or something)
 * {
 *   id: string
 *   hash: sha256 of "ID:PASSWORD"
 *   name: string
 * }
 */
const users = [];

/* Logged-in users.
 * {
 *   accessToken: string
 *   id: string | undefined
 *   name: string
 *   expire: number(time)
 * }
 */
const sessions = [];

/* Access token.
 *******************************************************************/
 
function generateAccessToken() {
  return crypto.randomBytes(12).toString("base64");
}

function generateTemporaryId() {
  while (1) {
    const id = "$" + crypto.randomBytes(6).toString("base64");
    if (!sessions.find(s => s.id === id)) return id;
  }
}

/* Check authentication for existing session.
 *******************************************************************/

function authenticateRequest(request) {
  const authorization = request.headers["authorization"];
  if (!authorization) return null;
  const [authMethod, accessToken] = authorization.trim().split(/\s+/);
  if (authMethod.toLowerCase() !== "bearer") return null;
  if (!accessToken) return null;
  
  for (const session of sessions) {
    if (session.accessToken !== accessToken) continue;
    session.expire = Date.now() + SESSION_EXPIRE_TIME_MS;
    return {
      id: session.id,
      name: session.name,
    };
  }
  
  // Nice try, Ivan.
  return null;
}

/* Login: Validate id and password, and create a new session.
 *****************************************************************/
 
function login(id, password) {
  if (!id || !password) return null;
  if (sessions.find(s => s.id === id)) return null; // already logged in
  const hash = crypto.createHash("sha256").update(`${id}:${password}`).digest("hex");
  for (const user of users) {
    if (user.hash === hash) {
      const accessToken = generateAccessToken();
      sessions.push({
        accessToken,
        id,
        name: user.name,
        expire: Date.now() + SESSION_EXPIRE_TIME_MS,
      });
      return {
        accessToken,
        name: user.name,
      };
    }
  }
  return null;
}

/* Login without credentials: Just a made-up name that needn't even be unique.
 *****************************************************************/
 
function loginWithoutCredentials(name) {
  const accessToken = generateAccessToken();
  const id = generateTemporaryId();
  sessions.push({
    accessToken,
    name,
    id,
    expire: Date.now() + SESSION_EXPIRE_TIME_MS,
  });
  return accessToken;
}

/* Create a new user record. Returns boolean.
 ****************************************************************/
 
function createUser(id, password, name) {
  if (!id || !password || !name) return false;
  if (users.find(u => u.id === id)) return false;
  const hash = crypto.createHash("sha256").update(`${id}:${password}`).digest("hex");
  users.push({
    id,
    hash,
    name,
  });
  return true;
}

/* Delete a user record, and log him out if logged in.
 *****************************************************************/
 
function deleteUser(id) {
  let index = users.findIndex(u => u.id === id);
  if (index >= 0) users.splice(index, 1);
  index = sessions.findIndex(s => s.id === id);
  if (index >= 0) sessions.splice(index, 1);
}

/* Logout.
 *****************************************************************/
 
function logout(id) {
  const index = sessions.findIndex(s => s.id === id);
  if (index >= 0) {
    sessions.splice(index, 1);
    return true;
  }
  return false;
}

/* Return a copy of all users and sessions.
 *****************************************************************/
 
function getAll() {
  return {
    users: users.map(u => ({ ...u })),
    sessions: sessions.map(s => ({ ...s })),
  };
}

/* Drop expired sessions.
 *****************************************************************/
 
function dropExpiredSessions() {
  const now = Date.now();
  for (let i=sessions.length; i-->0; ) {
    const session = sessions[i];
    if (session.expire > now) continue;
    sessions.splice(i, 1);
  }
}

/* Get the user details visible to the rest of the system, for someone logged in.
 * This definitely includes name and definitely doesn't include accessToken.
 ****************************************************************/
 
function getLoggedInUserDetails(id) {
  const session = sessions.find(s => s.id === id);
  if (!session) return null;
  return {
    id,
    name: session.name,
  };
}

/* TOC
 *****************************************************************/

module.exports = {
  authenticateRequest,
  login,
  createUser,
  loginWithoutCredentials,
  deleteUser,
  logout,
  getAll,
  dropExpiredSessions,
  getLoggedInUserDetails,
};
