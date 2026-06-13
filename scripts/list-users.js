const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function main() {
    // Connect to DB
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('Fetching all users from database...');
        const [users] = await connection.execute(
            'SELECT user_id, email, role, firstname, lastname FROM User ORDER BY user_id ASC'
        );

        if (users.length === 0) {
            console.log('No users found in the database.');
        } else {
            console.log('\n--- Registered Users List ---');
            console.table(users);
            console.log(`Total: ${users.length} user(s)\n`);
        }
    } catch (err) {
        console.error('Error fetching users:', err.message);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
