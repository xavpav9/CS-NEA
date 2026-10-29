import { queryDatabase } from "./database.js";

const User = (function() {
  async function getUserInfoById(id) {
    const userInfo = await queryDatabase("SELECT * FROM Users WHERE userid = $1;", [id]);
    if (userInfo && userInfo.rows.length) return userInfo.rows[0];
    else return false;
  }

  async function getUserInfoByEmail(email) {
    const res = await queryDatabase("SELECT * FROM Users WHERE email = $1;", [email]);
    if (res && res.rows.length) return res.rows[0];
    else return false;
  }

  async function addUser(name, email, hashedPassword) {
    const res = await queryDatabase("INSERT INTO Users(name, email, password) VALUES ($1, $2, $3);", [name, email, hashedPassword]);
    if (res) return res;
    else return false;
  }

  return {
    getUserInfoById,
    getUserInfoByEmail,
    addUser,
  };
})();

export default User;
