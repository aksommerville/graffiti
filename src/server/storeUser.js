/* User {
 *   id
 *   name // Must be unique across all users
 *   hash (sha256 of "id:password"), null for temporary single-use user
 * }
 * TODO stats, preferences, avatar
 */
 
const crypto = require("crypto");
const store = require("./store.js");

/* Password.
 ******************************************************/
 
function hashPassword(id, password) {
  return crypto
    .createHash("sha256")
    .update(`${id}:${password}`)
    .digest("hex");
}

/* Validate.
 ******************************************************/
 
function validateEntity(user) {
  if (!user.name || !user.name.match(/^[0-9a-zA-Z]{1,12}$/)) {
    throw new Error("Invalid user name.");
  }
  //if (!user.hash) throw new Error("Password missing.");
  return true;
}

/* Get unused name.
 ******************************************************/
 
function getUnusedName() {
  const maxanon = store
    .getEntitiesOfType("user")
    .filter(u => u.name.match(/^Anonymous\d*$/))
    .map(u => +u.name.replace("Anonymous", "0"))
    .reduce((a, v) => ((a > v) ? a : v), 0);
  return `Anonymous${maxanon + 1}`;
}

/* Get user by name.
 ******************************************************/
 
function getUserByName(name) {
  return store
    .getEntitiesOfType("user")
    .find(u => u.name === name);
}

// As a convenience, also check the password.
function getUserByNameAndPassword(name, password) {
  const user = getUserByName(name);
  if (!user) return null;
  if (user.hash) {
    if (!password) return null;
    if (hashPassword(user.id, password) !== user.hash) return null;
  } else {
    if (password) return null;
  }
  return user;
}

/* New.
 ******************************************************/
 
function newEntity(id) {
  return {
    id,
    name: getUnusedName(),
  };
}

/* Apply changes.
 ******************************************************/
 
function applyChanges(original, incoming) {
  let modified = {...original};
  let reallyChanged = false;
  if (incoming.name && (modified.name !== incoming.name)) {
    if (getUserByName(incoming.name)) throw new Error(`Name in use`);
    modified.name = name;
    reallyChanged = true;
  }
  if (incoming.hash && (modified.hash !== incoming.hash)) {
    modified.hash = hash;
    reallyChanged = true;
  }
  return reallyChanged ? modified : original;
}

/* Change password.
 ******************************************************/
 
function changePassword(id, oldPassword, newPassword) {
  if (!newPassword) throw new Error(`Password must not be empty`);

  const entity = store.getEntity("user", id);
  if (!entity) throw new Error(`User '${id}' not found`);
  
  if (oldPassword) {
    if (!entity.hash) throw new Error(`Old password incorrect`);
    const oldHash = hashPassword(id, oldPassword);
    if (oldHash !== entity.hash) throw new Error (`Old password incorrect`);
  } else {
    if (entity.hash) throw new Error(`Old password incorrect`);
  }
  
  const changes = {
    hash: hashPassword(`${id}:${newPassword}`),
  };
  return store.updateEntity("user", id, changes);
}

/* TOC
 ******************************************************/

module.exports = {
  name: "user",
  schema: {
    validateEntity,
    newEntity,
    applyChanges,
  },
  hashPassword,
  getUnusedName,
  getUserByName,
  getUserByNameAndPassword,
  changePassword,
};
