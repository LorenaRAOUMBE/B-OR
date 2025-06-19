const express = require("express");
const pool = require("../config/db");
const router = express.Router();

// Afficher tous les produits
router.get("/produits", async (req, res) => {
    try {
        const [resultat] = await pool.query("SELECT * FROM produits");
        res.status(200).json(resultat);
    } catch (erreur) {
        console.log("Erreur lors de la récupération des produits:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Afficher un produit par ID
router.get("/produits/:id_produit", async (req, res) => {
    try {
        const [resultat] = await pool.query(
            "SELECT * FROM produits WHERE id_produit = ?",
            [req.params.id_produit]
        );

        if (resultat.length === 0) {
            return res.status(404).json({ error: "Produit non trouvé" });
        }
        res.status(200).json(resultat[0]);
    } catch (erreur) {
        console.error("Erreur lors de la récupération du produit:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Ajouter un produit
router.post("/produits", async (req, res) => {
    try {
        const { id_categorie,nom,genre,matieres,description,stock, image, prix} = req.body;
        const [resultat] = await pool.query(
            "INSERT INTO produits (id_categorie,nom,genre,matieres,description,stock, image, prix) VALUES (?, ?, ?, ?, ?, ?,?,?)",
            [id_categorie,nom,genre,matieres, description,stock, image, prix]
        );
        res.status(201).json({
            message: "Produit créé",
            id: resultat.insertId
        });
    } catch (erreur) {
        console.error("Erreur lors de la création du produit:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Modifier un produit
router.put("/produits/:id_produit", async (req, res) => {
    try {
        const { id_categorie,nom,genre,matieres,description,stock, image, prix} = req.body;
        const id = req.params.id_produit;

        const [resultat] = await pool.query(
            "UPDATE produits SET id_categorie = ?, nom = ?,genre=?,matieres =? ,description = ?, stock = ?,  image = ? , prix = ?WHERE id_produit = ?",
            [id_categorie,nom,genre,matieres,description,stock, image, prix, id]
        );

        if (resultat.affectedRows === 0) {
            return res.status(404).json({ error: "Produit non trouvé" });
        }
        res.status(200).json({ message: "Produit mis à jour" });
    } catch (erreur) {
        console.error("Erreur lors de la modification du produit:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Supprimer un produit
router.delete("/produits/:id_produit", async (req, res) => {
    try {
        const [resultat] = await pool.query(
            "DELETE FROM produits WHERE id_produit = ?",
            [req.params.id_produit]
        );

        if (resultat.affectedRows === 0) {
            return res.status(404).json({ error: "Produit non trouvé" });
        }
        res.status(200).json({ message: "Produit supprimé" });
    } catch (erreur) {
        console.error("Erreur lors de la suppression du produit:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

module.exports = router;