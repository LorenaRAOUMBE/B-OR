const pool = require('../config/db');

class Transaction {
    static async create(transactionData) {
        const sql = `
            INSERT INTO transactions_pvit 
            (transaction_id, reference, amount, status, customer_account_number, 
            fees, total_amount, charge_owner, free_info, 
            transaction_operation, operator) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            transactionData.transaction_id,
            transactionData.reference,
            transactionData.amount,
            transactionData.status || 'PENDING',
            transactionData.customer_account_number,
            transactionData.fees || null,
            transactionData.total_amount || null,
            transactionData.charge_owner || null,
            transactionData.free_info || null,
            transactionData.transaction_operation || 'PAYMENT',
            transactionData.operator || null
        ];
        try {
            const [results] = await pool.query(sql, values);
            return results;
        } catch (error) {
            console.error('Erreur création transaction:', error);
            throw error;
        }
    }

    static async updateTransaction(reference, transactionData) {
        const sql = `
            UPDATE transactions_pvit 
            SET 
                transaction_id = ?,
                status = ?,
                fees = ?,
                total_amount = ?,
                charge_owner = ?,
                operator = ?,
                updated_at = NOW()
            WHERE reference = ?
        `;
        const values = [
            transactionData.transaction_id,
            transactionData.status,
            transactionData.fees || null,
            transactionData.total_amount || null,
            transactionData.charge_owner || null,
            transactionData.operator || null,
            reference
        ];
        try {
            const [results] = await pool.query(sql, values);
            return results.affectedRows > 0;
        } catch (error) {
            console.error('Erreur mise à jour transaction:', error);
            throw error;
        }
    }

    static async findByReference(reference) {
        const sql = 'SELECT * FROM transactions_pvit WHERE reference = ?';
        try {
            const [results] = await pool.query(sql, [reference]);
            return results[0];
        } catch (error) {
            console.error('Erreur recherche transaction:', error);
            throw error;
        }
    }
}

module.exports = Transaction;