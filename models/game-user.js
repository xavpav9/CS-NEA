import { queryDatabase } from "./database.js";

const GameUser = (function() {
  async function getGameUserInfoByID(id) {
    const res = await queryDatabase("SELECT * FROM GameUsers WHERE game_user_id = $1;", [id]);
    return (res && res.rows.length) ? res.rows[0] : false;
  }

  async function getGameUsersInfoByGameID(gameID) {
    const res = await queryDatabase("SELECT * FROM GameUsers WHERE game_id = $1", [gameID]);
    return (res && res.rows.length) ? res.rows : [];
  }

  async function addGameUser(userID, gameID, playerLocation) {
    const res = await queryDatabase("INSERT INTO GameUsers(user_id, game_id, score, player_location, in_use) VALUES ($1, $2, 0, $3, true);", [userID, gameID, playerLocation]);
    return res;
  }

  return {
    getGameUserInfoByID,
    getGameUsersInfoByGameID,
    addGameUser,
  };
})();

export default GameUser;
