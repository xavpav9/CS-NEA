import { Client, Pool } from "pg";
import bcrypt from "bcrypt";

const SQL = `
DROP TABLE IF EXISTS GameUsers;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS CurrentGames;

CREATE TABLE Users (
  user_id BIGSERIAL PRIMARY KEY,
  name VARCHAR(40),
  email VARCHAR(40),
  password VARCHAR(80)
);

CREATE TABLE CurrentGames (
  game_id BIGINT PRIMARY KEY,
  max_player_count INT,
  current_player_turn INT
);

CREATE TABLE GameUsers (
  game_user_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES Users(user_id),
  game_id BIGINT REFERENCES CurrentGames(game_id),
  score INT,
  player_location INT,
  in_use BOOL
);
`
const INSERT_USERS = `
INSERT INTO Users (name, email, password)
VALUES 
  ('NotLoggedIn', '', ''),
  ('Alice', 'alice@gmail.com', $1),
  ('Bob', 'bob@hotmail.com', $1),
  ('Caleb', 'caleb@yahoo.com', $1);
`;

const pool = new Pool({
  /*
  user: "postgres",
  password: "postgres",
  host: "localhost",
  port: 5432,
  database: "mydb",
  */
  connectionString: "postgresql://postgres:postgres@localhost:5432/mydb",
});

async function seedDatabase() {
  console.log("seeding database...")
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@localhost:5432/mydb",
  });

  const password = await bcrypt.hash("123412341234", 1);

  await client.connect();
  await client.query(SQL);
  await client.query(INSERT_USERS, [password]);
  await client.end();
  console.log("...database seeded");
}

async function queryDatabase(query, parameters=[]) {
  let res = false;
  try {
    res = await pool.query(query, parameters);
  } catch (err) {
    console.log(err);
  } finally {
    return res;
  }
}

export { seedDatabase, queryDatabase, };
