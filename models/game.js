import { queryDatabase } from "./database.js";

const Game = (function() {
  async function getGameInfoByID(id) {
    const res = await queryDatabase("SELECT * FROM Games WHERE game_id = $1;", [id]);
    return (res && res.rows.length) ? res.rows[0] : false;
  }

  async function addGame(gameID, maxPlayerCount, currentPlayerTurn=0) {
    const res = await queryDatabase("INSERT INTO Games(game_id, max_player_count, current_player_turn) VALUES ($1, $2, $3);", [gameID, maxPlayerCount, currentPlayerTurn]);
    return res;
  }

  async function updatePlayerCount(id, maxPlayerCount) {
    const res = await queryDatabase("UPDATE Users SET max_player_count = $1 WHERE game_id = $2;", [playerCount, id]);
    return res;
  }

  return {
    getGameInfoByID,
    addGame,
    updatePlayerCount,
  };
})();

export default Game;
