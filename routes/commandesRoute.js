const express = require("express");
const pool = require("../config/db");
const router = express.Router();

// Afficher toutes les commandes
router.get("/commandes", async (req, res) => {
    try {
        const [resultat] = await pool.query(`
            SELECT commandes.*, clients.nom as nom_client 
            FROM commandes 
            JOIN clients ON commandes.id_client = clients.id_client
        `);
        res.status(200).json(resultat);
    } catch (erreur) {
        console.log("Erreur lors de la récupération des commandes:", erreur);
        res.status(500).json({ error: "Erreur serveur", details: erreur.message });
    }
});

// Afficher une commande spécifique
router.get("/commandes/:id_commande", async (req, res) => {
    try {
        const { id_commande } = req.params;

        const [commandeResultat] = await pool.query(
            `SELECT 
                c.id_commande,
                c.id_client,
                c.mode_paiement,
                c.montant,
                c.date_paiement,
                c.adresse_livraison,
                c.statut_commande,
                c.date_creation
             FROM commandes c
             JOIN clients cl ON c.id_client = cl.id_client
             WHERE c.id_commande = ?`,
            [id_commande]
        );

        if (commandeResultat.length === 0) {
            return res.status(404).json({ message: "Commande non trouvée." });
        }

        const [detailsResultat] = await pool.query(
            `SELECT 
                dc.id_produit, 
                p.nom AS nom_produit, 
                dc.quantite, 
                dc.prix_unitaire
             FROM details_commande dc
             JOIN produits p ON dc.id_produit = p.id_produit
             WHERE dc.id_commande = ?`,
            [id_commande]
        );

        res.status(200).json({
            commande: commandeResultat[0],
            details_produits: detailsResultat
        });
    } catch (erreur) {
        console.error(`Erreur lors de la récupération de la commande ${req.params.id_commande}:`, erreur);
        res.status(500).json({ 
            message: "Erreur serveur lors de la récupération de la commande.", 
            details: erreur.message 
        });
    }
});

// Créer une nouvelle commande
// routes/commandesRoute.js

// ... (début du fichier)

router.post("/commandes", async (req, res) => {
    let connection;
    let id_nouvelle_commande; // Déclaration AVANT le try
    try {
        const { id_client, mode_paiement, adresse_livraison, produits } = req.body;
        
        // --- 1. Validation Initiale (améliorée) ---
        if (!id_client || !mode_paiement || !adresse_livraison || !produits || !Array.isArray(produits) || produits.length === 0) {
            return res.status(400).json({ 
                message: "Données de commande incomplètes ou invalides. 'id_client', 'mode_paiement', 'adresse_livraison' et 'produits' (tableau non vide) sont requis." 
            });
        }
        
        const modesPaiementValides = ['Carte', 'PayPal', 'Espèces', 'Mobile Money'];
        if (!modesPaiementValides.includes(mode_paiement)) {
            return res.status(400).json({ 
                message: "Mode de paiement invalide. Les options sont : 'Carte', 'PayPal', 'Espèces', 'Mobile Money'." 
            });
        }

        let montantTotalCommande = 0;
        connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const produitsPourDetails = []; 

            for (const item of produits) {
                // --- Validation et conversion de quantite ---
                // S'assurer que quantite est un nombre et > 0
                const quantiteDemandee = parseInt(item.quantité, 10); // Convertir en entier
               
                // Récupérer le produit et son prix/stock actuel
                const [produitInfo] = await connection.query(
                    "SELECT nom, prix, stock FROM produits WHERE id_produit = ? FOR UPDATE", 
                    [item.id_produit]
                );

                const produit = produitInfo[0];
                // --- S'assurer que produit.stock est un nombre ---
                const stockActuel = parseInt(produit.stock, 10); // Convertir en entier
                if (isNaN(stockActuel)) {
                    throw new Error(`Le stock du produit '${produit.nom}' (ID: ${item.id_produit}) est corrompu ou non numérique.`);
                }

                if (stockActuel < quantiteDemandee) {
                    throw new Error(`Stock insuffisant pour le produit '${produit.nom}' (ID: ${item.id_produit}). Stock disponible: ${stockActuel}, demandée: ${quantiteDemandee}.`);
                }

                // --- Calcul du nouveau stock (ici était le problème) ---
                const nouveauStock = stockActuel - quantiteDemandee; // Maintenant, les deux sont garantis être des nombres

                await connection.query( // Cette ligne est la 92 dans le message d'erreur
                    "UPDATE produits SET stock = ? WHERE id_produit = ?",
                    [nouveauStock, item.id_produit]
                );
                
                const prixUnitaire = parseFloat(produit.prix); 

                montantTotalCommande += prixUnitaire * quantiteDemandee;

                produitsPourDetails.push({
                    id_produit: item.id_produit,
                    quantité: quantiteDemandee, // Utiliser la quantité validée
                    prix_unitaire: prixUnitaire
                });
            }

            const [resultatCommande] = await connection.query(
                "INSERT INTO commandes (id_client, mode_paiement, montant, date_paiement, adresse_livraison, statut_commande, date_creation) VALUES (?, ?, ?, NOW(), ?, 'en_attente', NOW())",
                [id_client, mode_paiement, montantTotalCommande, adresse_livraison]
            );
            id_nouvelle_commande = resultatCommande.insertId; // Affectation ici

            // Insertion des détails de commande
            for (const detail of produitsPourDetails) {
                await connection.query(
                    "INSERT INTO details_commande (id_commande, id_produit, quantité, prix_unitaire) VALUES (?, ?, ?, ?)",
                    [id_nouvelle_commande, detail.id_produit, detail.quantité, detail.prix_unitaire]
                );
            }

            await connection.commit();
            res.status(201).json({
                message: "Commande créée avec succès.",
                id_commande: id_nouvelle_commande,
                montant_total: montantTotalCommande
            });

        } catch (err) {
            await connection.rollback(); 
            throw err; 
        } finally {
            if (connection) connection.release(); 
        }
    } catch (erreur) {
        console.error("Erreur lors de la création de la commande:", erreur);
        let statusCode = 500;
        let userMessage = "Erreur serveur lors de la création de la commande.";

        if (erreur.message.includes("Stock insuffisant")) {
            statusCode = 400; 
            userMessage = erreur.message; 
        } else if (erreur.message.includes("Produit avec l'ID") && erreur.message.includes("non trouvé")) {
            statusCode = 404; 
            userMessage = erreur.message;
        } else if (erreur.message.includes("Quantité invalide")) {
            statusCode = 400;
            userMessage = erreur.message;
        } else if (erreur.message.includes("Le stock du produit") && erreur.message.includes("est corrompu")) {
            statusCode = 500; // C'est une erreur interne de données
            userMessage = "Problème avec les données de stock du produit.";
        } else if (erreur.sqlMessage && erreur.code === 'ER_NO_REFERENCED_ROW_2') {
            statusCode = 400;
            userMessage = "L'ID client fourni n'existe pas.";
        } else if (erreur.message.includes("Mode de paiement invalide")) {
            statusCode = 400;
            userMessage = erreur.message;
        }
        
        res.status(statusCode).json({ message: userMessage, details: erreur.message });
    }
});

// Mettre à jour le statut d'une commande
router.put("/commandes/:id_commande", async (req, res) => {
    try {
        const { id_commande } = req.params;
        const { statut_commande } = req.body;
        const statutsValides = ['en_attente', 'validée', 'expédiée', 'livrée', 'annulée'];
        if (!statut_commande || !statutsValides.includes(statut_commande)) {
            return res.status(400).json({ 
                message: `Statut de commande invalide. Les statuts acceptés sont: ${statutsValides.join(', ')}.` 
            });
        }
        const [resultat] = await pool.query(
            "UPDATE commandes SET statut_commande = ? WHERE id_commande = ?",
            [statut_commande, id_commande]
        );
        if (resultat.affectedRows === 0) {
            return res.status(404).json({ message: "Commande non trouvée." });
        }
        res.status(200).json({ message: `Statut de la commande ${id_commande} mis à jour à '${statut_commande}'.` });
    } catch (erreur) {
        console.error(`Erreur lors de la mise à jour du statut de la commande ${req.params.id_commande}:`, erreur);
        res.status(500).json({ 
            message: "Erreur serveur lors de la mise à jour du statut de la commande.", 
            details: erreur.message 
        });
    }
});

// Supprimer une commande
router.delete("/commandes/:id_commande", async (req, res) => {
    let connection;
    try {
        const { id_commande } = req.params;
        if (!id_commande || isNaN(id_commande)) {
            return res.status(400).json({ message: "ID de commande invalide." });
        }
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Récupérer les détails de la commande
        const [detailsProduits] = await connection.query(
            `SELECT id_produit, quantité FROM details_commande WHERE id_commande = ? FOR UPDATE`,
            [id_commande]
        );

        // Vérifier si la commande existe
        const [commandeExiste] = await connection.query(
            `SELECT id_commande FROM commandes WHERE id_commande = ?`,
            [id_commande]
        );
        if (commandeExiste.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Commande non trouvée." });
        }

        // Supprimer la commande principale
        const [resultatSuppressionCommande] = await connection.query(
            `DELETE FROM commandes WHERE id_commande = ?`,
            [id_commande]
        );
        if (resultatSuppressionCommande.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Commande non trouvée." });
        }

        // Remettre les produits en stock
        for (const item of detailsProduits) {
            await connection.query(
                `UPDATE produits SET stock = stock + ? WHERE id_produit = ?`,
                [item.quantité, item.id_produit]
            );
        }

        await connection.commit();
        res.status(200).json({ message: "Commande supprimée et stocks mis à jour avec succès." });
    } catch(erreur) {
        if (connection) await connection.rollback();
        console.error("Erreur inattendue lors de la suppression de la commande:", erreur);
        res.status(500).json({ 
            message: "Erreur serveur inattendue.", 
            details: erreur.message 
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;