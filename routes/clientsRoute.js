const express = require("express");
const pool = require('../config/db');
const bcrypt = require("bcrypt");
const router = express.Router();

// Afficher tous les clients
router.get("/clients", async (req, res) => {
    try {
        const [resultat] = await pool.query("SELECT * FROM clients");
        res.status(200).json(resultat);
    } catch (erreur) {
        console.error("Erreur lors de la récupération des clients:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Afficher un client
router.get("/clients/:id_client", async (req, res) => {
    try {
        const [resultat] = await pool.query(
            "SELECT * FROM clients WHERE id_client = ?",
            [req.params.id_client]
        );

        if (resultat.length === 0) {
            return res.status(404).json({ error: "Client non trouvé" });
        }
        res.status(200).json(resultat[0]);
    } catch (erreur) {
        console.error("Erreur lors de la récupération du client:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Ajouter un client
router.post("/clients", async (req, res) => {
    try {
        const {
            nom,
            email,
            password,
            telephone,
            otp_code,
            otp_expiration,
            date_creation,
            image
        } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        const statut_compte = req.body.statut_compte || "0";

        const [resultat] = await pool.query(
            `INSERT INTO clients (
                nom, email, password, telephone, statut_compte, 
                otp_code, otp_expiration, date_creation, image
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nom, email, hashedPassword, telephone, statut_compte,
                otp_code, otp_expiration, date_creation, image
            ]
        );

        res.status(201).json({
            message: "Client créé avec succès",
            id: resultat.insertId
        });
    } catch (erreur) {
        console.error("Erreur lors de la création du client:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Modifier un client
router.put("/clients/:id_client", async (req, res) => {
    try {
        const {
            nom,
            email,
            password,
            telephone,
            statut_compte
        } = req.body;
        const image = req.body.image || null;
        const hashedPassword = await bcrypt.hash(password, 10);

        const [resultat] = await pool.query(
            `UPDATE clients 
             SET nom = ?, email = ?, password = ?, 
                 telephone = ?, image = ?, statut_compte = ? 
             WHERE id_client = ?`,
            [nom, email, hashedPassword, telephone, image, statut_compte, req.params.id_client]
        );

        if (resultat.affectedRows === 0) {
            return res.status(404).json({ error: "Client non trouvé" });
        }

        res.status(200).json({ message: "Client mis à jour avec succès" });
    } catch (erreur) {
        console.error("Erreur lors de la modification du client:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Supprimer un client
router.delete("/clients/:id_client", async (req, res) => {
    try {
        const [resultat] = await pool.query(
            "DELETE FROM clients WHERE id_client = ?",
            [req.params.id_client]
        );

        if (resultat.affectedRows === 0) {
            return res.status(404).json({ error: "Client non trouvé" });
        }

        res.status(200).json({ message: "Client supprimé avec succès" });
    } catch (erreur) {
        console.error("Erreur lors de la suppression du client:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

module.exports = router;