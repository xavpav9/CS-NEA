import { queryDatabase } from "./database.js";

const User = (function() {
  async function getUserInfoById(id) {
    const userInfo = await queryDatabase("SELECT * FROM Users WHERE userid = $1;", [id]);
    if (userInfo && userInfo.rows.length) return userInfo.rows[0];
    else return false;
  }

  async function getUserInfoByEmail(email) {
    const userInfo = await queryDatabase("SELECT * FROM Users WHERE email = $1;", [email]);
    if (userInfo && userInfo.rows.length) return userInfo.rows[0];
    else return false;
  }

  return {
    getUserInfoById,
    getUserInfoByEmail,
  };
})();

export default User;
