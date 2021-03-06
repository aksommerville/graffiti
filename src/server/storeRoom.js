/* Room {
 *   id
 *   ownerUserId
 *   userIds: [string...]
 *   state: "gather" | "play" | "conclude" | "cancel"
 *   startTime: ms // scheduled time for gather=>play
 *   endTime: ms // scheduled time for play=>conclude
 *   backgroundImageUrl
 *   showInPublicLists
 *   permitAnyLogin // must be true, since we don't have fine-grained authz yet (TODO)
 *   permitAnyEdit // if false, only the owner can edit
 *   improvements: { userId: text }
 *   electionId // set in "conclude" state, when an election is running
 * }
 */
 
const store = require("./store.js");
 
/* New entity.
 ******************************************************/
 
function newEntity(id) {
  return {
    id,
    ownerUserId: null,
    userIds: [],
    state: "gather",
    startTime: null,
    endTime: null,
    backgroundImageUrl: null,
    showInPublicLists: false,
    permitAnyLogin: true,
    permitAnyEdit: false,
    improvements: {},
    electionId: null,
  };
}

/* Validate.
 *****************************************************/
 
function validateEntity(entity) {
  return true;
}

/* Apply changes.
 *****************************************************/
 
function applyChanges(original, incoming) {
  const modified = {...original};
  let reallyChanged = false;
 
  const scalar = (k, validate) => {
    if (!incoming.hasOwnProperty(k)) return;
    if (modified[k] === incoming[k]) return;
    if (validate) validate(incoming[k]);
    modified[k] = incoming[k];
    reallyChanged = true;
  };
  
  scalar("ownerUserId");
  scalar("startTime");
  scalar("endTime");
  scalar("backgroundImageUrl");
  scalar("showInPublicLists");
  scalar("permitAnyLogin");
  scalar("permitAnyEdit");
  scalar("electionId");
  
  scalar("state", (state) => {
    switch (state) {
      case "gather":
      case "play":
      case "conclude":
      case "cancel":
        break;
      default: throw new Error(`Invalid state '${state}'`);
    }
  });
  
  if (incoming.userIds) {
    if (modified.userIds.length !== incoming.userIds.length) {
      modified.userIds = incoming.userIds;
      reallyChanged = true;
    } else {
      for (const id of incoming.userIds) {
        if (modified.userIds.indexOf(id) < 0) {
          modified.userIds = incoming.userIds;
          reallyChanged = true;
          break;
        }
      }
    }
  }
  
  if (incoming.improvements) {
    const akeys = Object.keys(modified.improvements);
    const bkeys = Object.keys(incoming.improvements);
    if (akeys.length !== bkeys.length) {
      modified.improvements = incoming.improvements;
      reallyChanged = true;
    } else {
      for (const userId of bkeys) {
        const fresh = incoming.improvements[userId];
        const prior = modified.improvements[userId];
        if (fresh !== prior) {
          modified.improvements = incoming.improvements;
          reallyChanged = true;
          break;
        }
      }
    }
  }
  
  return reallyChanged ? modified : original;
}
 
/* TOC
 *******************************************************/

module.exports = {
  name: "room",
  schema: {
    newEntity,
    validateEntity,
    applyChanges,
  },
};
