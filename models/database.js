import { Client, Pool } from "pg";
import bcrypt from "bcrypt";

const SQL = `
DROP TABLE IF EXISTS Users;

CREATE TABLE Users (
  userid BIGSERIAL PRIMARY KEY,
  name VARCHAR(40),
  email VARCHAR(40),
  password VARCHAR(80)
);
`
const INSERT_USERS = `
INSERT INTO Users (name, email, password)
VALUES 
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
