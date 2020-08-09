const store = require("./store.js");
const storeVote = require("./storeVote.js");

/* Generate election ID.
 * There is no election entity. So add a timestamp to help uniqueify them.
 *************************************************/
 
function generateElectionId() {
  const prefix = store.generateRandomId();
  const suffix = (Date.now() % 1000).toString().padStart(3, '0');
  const extra = Math.random().toFixed(3).substr(2);
  return `${prefix}${suffix}${extra}`;
}

/* Cast vote.
 **************************************************/
 
function castVote(roomId, voterUserId, targetUserId) {
  let room = store.getEntity("room", roomId);
  if (!room) return null;
  
  if (!room.electionId) {
    if (room.state !== "conclude") return null;
    const electionId = generateElectionId();
    if (!(room = store.updateEntity("room", {
      ...room,
      electionId,
    }))) return null;
  }
  
  //TODO This would be way more efficient if vote id were derived from (electionId,voterUserId).
  for (const vote of store.getEntitiesOfType("vote")) {
    if (vote.electionId !== room.electionId) continue;
    if (vote.voter !== voterUserId) continue;
    if (!store.updateEntity("vote", {
      ...vote,
      target: targetUserId,
    })) return null;
    return getElection(room.electionId);
  }
  
  // User's first vote in this election.
  if (!store.addEntity("vote", {
    room.electionId,
    voter: voterUserId,
    target: targetUserId,
  })) return null;
  
  return getElection(room.electionId);
}

/* Get election.
 ***************************************************/
 
function getElection(electionId) {

  const election = {
    id: electionId,
    candidates: [], // userId, name, count ; we'll sort by count high-to-low
  };

  for (const vote of store.getEntitiesOfType("vote")) {
    if (vote.electionId !== electionId) continue;
    let candidate = election.candidates.find(c => c.userId === vote.target);
    if (!candidate) {
      candidate = {
        userId: vote.target,
        count: 0,
      };
      election.candidates.push(candidate);
      const user = store.getEntity("user", vote.target);
      if (user) {
        candidate.name = user.name,
      } else {
        candidate.name = vote.target,
      }
    }
    candidate.count++;
  }
  
  election.candidates.sort((a, b) => {
    if (a.count > b.count) return -1;
    if (a.count < b.count) return 1;
    return 0;
  });

  return election;
}

function getElectionForRoom(roomId) {
  const room = store.getEntity("room", roomId);
  if (!room) return null;
  if (!room.electionId) return null;
  return getElection(room.electionId);
}

/* TOC
 **********************************************/
 
module.exports = {
  castVote, // (roomId,voterUserId,targetUserId) => election ; creates election if necessary
  getElection, // (electionId) => election
  getElectionForRoom, // (roomId) => election
};

/*
XXX I don't think this is working...
Either make election an entity that we can subscribe on, or keep the in-progress or more-recent election inside the room.
We have no straightforward way of reporting the end of an election as is.
*/
