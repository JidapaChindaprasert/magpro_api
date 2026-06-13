const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const argon2 = require('argon2');
const mysql = require('mysql2/promise');

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node scripts/reset-password.js <email> <new_password>');
        process.exit(1);
    }

    const [email, newPassword] = args;

    // Connect to DB
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log(`Hashing new password for ${email}...`);
        const passwordHash = await argon2.hash(newPassword);

        console.log(`Updating password in database...`);
        const [result] = await connection.execute(
            'UPDATE User SET password = ? WHERE email = ?',
            [passwordHash, email]
        );

        if (result.affectedRows > 0) {
            console.log(`\nSuccess! Password for ${email} updated successfully.`);
        } else {
            console.error(`\nError: No user found with email ${email}`);
        }
    } catch (err) {
        console.error('Error changing password:', err.message);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
