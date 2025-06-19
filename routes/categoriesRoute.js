const express = require("express");
const pool = require("../config/db");
const router = express.Router();

// Afficher toutes les catégories
router.get("/categories", async (req, res) => {
    try {
        const [resultat] = await pool.query("SELECT * FROM categories");
        res.status(200).json(resultat);
    } catch (erreur) {
        console.log("Erreur lors de la récupération des catégories:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Afficher une categorie
router.get("/categories/:id_categorie", async (req, res) => {
    try {
        const [resultat] = await pool.query(
            "SELECT * FROM categories WHERE id_categorie = ?",
            [req.params.id_categorie]
        );

        if (resultat.length === 0) {
            return res.status(404).json({ error: "Catégorie non trouvée" });
        }
        res.status(200).json(resultat[0]);
    } catch (erreur) {
        console.error("Erreur lors de la récupération de la catégorie:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Ajouter une catégorie
router.post("/categories", async (req, res) => {
    try {
        const { nom, image } = req.body;
        const [resultat] = await pool.query(
            "INSERT INTO categories (nom, image) VALUES (?, ?)",
            [nom, image]
        );
        res.status(201).json({
            message: "Catégorie créée",
            id: resultat.insertId
        });
    } catch (erreur) {
        console.error("Erreur lors de la création de la catégorie:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Modifier une categorie
router.put("/categories/:id_categorie", async (req, res) => {
    try {
        const { nom, image } = req.body;
        const id = req.params.id_categorie;

        await pool.query(
            "UPDATE categories SET nom = ?, image = ? WHERE id_categorie = ?",
            [nom, image, id]
        );
        res.status(200).json({ message: "Catégorie mise à jour" });
    } catch (erreur) {
        console.error("Erreur lors de la modification de la catégorie:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Supprimer une catégorie
router.delete("/categories/:id_categorie", async (req, res) => {
    try {
        await pool.query(
            "DELETE FROM categories WHERE id_categorie = ?",
            [req.params.id_categorie]
        );
        res.status(200).json({ message: "Catégorie supprimée" });
    } catch (erreur) {
        console.error("Erreur lors de la suppression de la catégorie:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

module.exports = router;