import { queryDatabase } from "./database.js";

const User = (function() {
  async function getUserInfoByID(id) {
    const res = await queryDatabase("SELECT * FROM Users WHERE user_id = $1;", [id]);
    return (res && res.rows.length) ? res.rows[0] : false;
  }

  async function getUserInfoByEmail(email) {
    const res = await queryDatabase("SELECT * FROM Users WHERE email = $1;", [email]);
    return (res && res.rows.length) ? res.rows[0] : false;
  }

  async function addUser(name, email, hashedPassword) {
    const res = await queryDatabase("INSERT INTO Users(name, email, password) VALUES ($1, $2, $3);", [name, email, hashedPassword]);
    return res;
  }

  async function updateName(userID, name) {
    const res = await queryDatabase("UPDATE Users SET name = $1 WHERE user_id = $2;", [name, userID]);
    return res;
  }

  return {
    getUserInfoByID,
    getUserInfoByEmail,
    addUser,
    updateName,
  };
})();

export default User;
