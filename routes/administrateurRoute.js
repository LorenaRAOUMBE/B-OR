const express = require("express");
const pool = require('../config/db');
const bcrypt = require("bcrypt");
const router = express.Router();

// Afficher tous les administrateurs
router.get("/administrateur", async (req, res) => {
    try {
        const [resultat] = await pool.query("SELECT * FROM administrateur");
        res.status(200).json(resultat);
    } catch (erreur) {
        console.error("Erreur lors de la récupération des administrateurs:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Afficher un administrateur
router.get("/administrateur/:id_admin", async (req, res) => {
    try {
        const [resultat] = await pool.query(
            "SELECT * FROM administrateur WHERE id_admin = ?",
            [req.params.id_admin] // Correction : id_client -> id_admin
        );

        if (resultat.length === 0) {
            return res.status(404).json({ error: "Administrateur non trouvé" });
        }
        res.status(200).json(resultat[0]);
    } catch (erreur) {
        console.error("Erreur lors de la récupération de l'administrateur:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Ajouter un administrateur
router.post("/administrateur", async (req, res) => {
    try {
        const { nom, password, email, telephone } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const [resultat] = await pool.query(
            `INSERT INTO administrateur (
                nom, password, email, telephone
            ) VALUES (?, ?, ?, ?)`,
            [nom, hashedPassword, email, telephone]
        );

        res.status(201).json({
            message: "Administrateur créé avec succès",
            id: resultat.insertId
        });
    } catch (erreur) {
        console.error("Erreur lors de la création de l'administrateur:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Modifier un administrateur
router.put("/administrateur/:id_admin", async (req, res) => {
    try {
        const { nom, password, email, telephone } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const [resultat] = await pool.query(
            `UPDATE administrateur 
             SET nom = ?, password = ?, email = ?, telephone = ? 
             WHERE id_admin = ?`,
            [nom, hashedPassword, email, telephone, req.params.id_admin]
        );

        if (resultat.affectedRows === 0) {
            return res.status(404).json({ error: "Administrateur non trouvé" });
        }

        res.status(200).json({ message: "Administrateur mis à jour avec succès" });
    } catch (erreur) {
        console.error("Erreur lors de la modification de l'administrateur:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Supprimer un administrateur
router.delete("/administrateur/:id_admin", async (req, res) => {
    try {
        const [resultat] = await pool.query(
            "DELETE FROM administrateur WHERE id_admin = ?",
            [req.params.id_admin] // Correction : id_client -> id_admin
        );

        if (resultat.affectedRows === 0) {
            return res.status(404).json({ error: "Administrateur non trouvé" });
        }

        res.status(200).json({ message: "Administrateur supprimé avec succès" });
    } catch (erreur) {
        console.error("Erreur lors de la suppression de l'administrateur:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

module.exports = router;