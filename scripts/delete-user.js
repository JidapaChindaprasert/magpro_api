const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log('Usage: node scripts/delete-user.js <email>');
        process.exit(1);
    }

    const [email] = args;

    // Connect to DB
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log(`Searching for user with email ${email}...`);
        
        // Retrieve user information first to confirm
        const [users] = await connection.execute(
            'SELECT user_id, firstname, lastname, role FROM User WHERE email = ? LIMIT 1',
            [email]
        );

        if (users.length === 0) {
            console.error(`Error: No user found with email ${email}`);
            process.exit(1);
        }

        const user = users[0];
        console.log(`Found User: ${user.firstname} ${user.lastname} (${user.role}) - ID: ${user.user_id}`);
        console.log(`Deleting user account...`);

        const [result] = await connection.execute(
            'DELETE FROM User WHERE user_id = ?',
            [user.user_id]
        );

        if (result.affectedRows > 0) {
            console.log(`\nSuccess! Account for ${email} has been deleted successfully (cascaded profiles cleared).`);
        } else {
            console.error(`\nError: Failed to delete user.`);
        }
    } catch (err) {
        console.error('Error deleting user account:', err.message);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
