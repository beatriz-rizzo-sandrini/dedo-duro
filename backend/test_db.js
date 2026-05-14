const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: ''
    });
    console.log("Connected successfully without password!");
    await connection.end();
  } catch (error) {
    console.error("Failed to connect without password:", error.message);
  }
}

testConnection();
