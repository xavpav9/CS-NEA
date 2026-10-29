import { queryDatabase } from "./database.js";

const User = (function() {
  async function getUserInfoById(id) {
    const userInfo = await queryDatabase("SELECT * FROM Users WHERE userid = $1;", [id]);
    console.log(userInfo);
    if (userInfo && userInfo.rows.length) return userInfo.rows[0];
    else false;
  }

  return {
    getUserInfoById,
  };
})();

export default User;
