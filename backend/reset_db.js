const mysql = require('mysql2/promise');

async function resetPassword() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: ''
    });
    console.log("Connected in skip-grant-tables mode!");
    await connection.query("FLUSH PRIVILEGES;");
    await connection.query("ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('123456');");
    console.log("Password reset to 123456 successfully!");
    await connection.end();
  } catch (error) {
    console.error("Failed to reset password:", error.message);
  }
}

resetPassword();
