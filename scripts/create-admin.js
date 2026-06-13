const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const argon2 = require('argon2');
const mysql = require('mysql2/promise');

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.log('Usage: node scripts/create-admin.js <email> <password> <firstname> <lastname> [role]');
        console.log('Roles: admin, instructor (defaults to admin)');
        process.exit(1);
    }

    const [email, password, firstname, lastname, roleInput] = args;
    const role = roleInput || 'admin';

    if (!['admin', 'instructor'].includes(role)) {
        console.error('Error: Role must be "admin" or "instructor"');
        process.exit(1);
    }

    // Connect to DB
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // Force delete any existing users with the same email
        console.log(`Checking and deleting any existing user with email ${email}...`);
        const [deleteResult] = await connection.execute(
            'DELETE FROM User WHERE email = ?',
            [email]
        );

        if (deleteResult.affectedRows > 0) {
            console.log(`🗑️ Removed ${deleteResult.affectedRows} existing user(s) with email ${email}.`);
        }

        console.log(`Hashing password for ${email}...`);
        const passwordHash = await argon2.hash(password);

        console.log(`Inserting user into database with role "${role}"...`);
        const [result] = await connection.execute(
            'INSERT INTO User (role, firstname, lastname, email, password) VALUES (?, ?, ?, ?, ?)',
            [role, firstname, lastname, email, passwordHash]
        );

        console.log(`\nSuccess! User created successfully.`);
        console.log(`User ID: ${result.insertId}`);
        console.log(`Email: ${email}`);
        console.log(`Role: ${role}`);
    } catch (err) {
        console.error('Error creating user:', err.message);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
