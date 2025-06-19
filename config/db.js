const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const optionDB = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '', // Gestion du cas où le mot de passe est vide
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
};

const pool = mysql.createPool(optionDB);

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connecté à la base de données MySQL');
        connection.release();
    } catch (error) {
        console.error('❌ Détails de l\'erreur:', {
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        process.exit(1);
    }
};

testConnection();

module.exports = pool;