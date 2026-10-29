import { Client, Pool } from "pg";

const SQL = `
DROP TABLE IF EXISTS Users;

CREATE TABLE Users (
  userid BIGSERIAL PRIMARY KEY,
  name VARCHAR(40),
  email VARCHAR(40),
  password VARCHAR(40)
);

INSERT INTO Users (name, email, password)
VALUES 
  ('Alice', 'alice@gmail.com', '123412341234'),
  ('Bob', 'bob@hotmail.com', '123412341234'),
  ('Caleb', 'caleb@yahoo.com', '123412341234');
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

  await client.connect();
  await client.query(SQL);
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
