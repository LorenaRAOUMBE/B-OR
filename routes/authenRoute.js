require('dotenv').config();
const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Configuration du transporteur Nodemailer
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware d'authentification JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Erreur de vérification du jeton JWT:", err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// --- Inscription ---
router.post("/inscription", async (req, res) => {
    try {
        const { nom, email, password } = req.body;
        if (!nom || !email || !password) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires." });
        }
        const SALT_ROUNDS = 10;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Vérifier si l'utilisateur existe déjà
        const [users] = await pool.query('SELECT id_client FROM clients WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(409).json({ message: "Cet e-mail est déjà utilisé." });
        }

        // Insérer le nouvel utilisateur
        const [result] = await pool.query(
            'INSERT INTO clients (nom, email, password, statut_compte) VALUES (?, ?, ?, ?)',
            [nom, email, hashedPassword, 0]
        );
        const userId = result.insertId;

        // Générer et enregistrer l'OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await pool.query(
            'UPDATE clients SET otp_code = ?, otp_expiration = ? WHERE id_client = ?',
            [otpCode, otpExpiration, userId]
        );

        // Envoyer l'OTP par e-mail
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Votre Code de Vérification OTP',
            html: `<p>Votre code OTP est : <strong>${otpCode}</strong></p><p>Ce code est valide pendant 5 minutes.</p>`
        });

        res.status(201).json({
            message: "Inscription réussie. Un code OTP a été envoyé à votre e-mail.",
            requiresOtpVerification: true,
            email: email
        });
    } catch (err) {
        console.error("Erreur lors de l'inscription:", err);
        res.status(500).json({ message: "Une erreur est survenue lors de l'inscription." });
    }
});

// --- Vérification OTP ---
router.post("/verifier-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "E-mail et OTP sont obligatoires." });
        }

        const [results] = await pool.query("SELECT * FROM clients WHERE email = ?", [email]);
        if (results.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        const user = results[0];
        const currentTime = new Date();

        if (
            String(user.otp_code) === String(otp) &&
            user.otp_expiration && new Date(user.otp_expiration) > currentTime
        ) {
            // Marquer l'utilisateur comme vérifié
            await pool.query("UPDATE clients SET statut_compte = '1' WHERE id_client = ?", [user.id_client]);

            const token = jwt.sign(
                { id: user.id_client, email: user.email, statut_compte: 1 },
                JWT_SECRET,
                { expiresIn: "2h" }
            );

            return res.status(200).json({
                message: "Authentification 2FA réussie!",
                IdUtilisateur: user.id_client,
                token: token
            });
        } else {
            return res.status(400).json({ message: "OTP incorrect ou expiré" });
        }
    } catch (err) {
        console.error("Erreur lors de la vérification OTP:", err);
        res.status(500).json({ message: "Erreur serveur lors de la vérification OTP." });
    }
});

// --- Connexion ---
router.post("/connexion", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "E-mail et mot de passe obligatoires." });
        }

        const [result] = await pool.query("SELECT * FROM clients WHERE email = ?", [email]);
        if (result.length === 0) {
            return res.status(401).json({ message: "E-mail ou mot de passe incorrect." });
        }

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: "E-mail ou mot de passe incorrect." });
        }

        const token = jwt.sign(
            { id: user.id_client, nom: user.nom, email: user.email, statut_compte: user.statut_compte },
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.status(200).json({
            message: "Connexion réussie.",
            token: token,
            userId: user.id_client,
            statut_compte: user.statut_compte
        });
    } catch (err) {
        console.error("Erreur lors de la connexion:", err);
        res.status(500).json({ message: "Une erreur interne est survenue." });
    }
});

// route por l administrateur

// --- Inscription ---

router.post("/register", async (req, res) => {
    try {
        const { nom, email, password } = req.body;
        if (!nom || !email || !password) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires." });
        }
        const SALT_ROUNDS = 10;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Vérifier si l'utilisateur existe déjà
        const [users] = await pool.query('SELECT id_admin FROM administrateur WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(409).json({ message: "Cet e-mail est déjà utilisé." });
        }

        // Insérer le nouvel utilisateur
        const [result] = await pool.query(
            'INSERT INTO administrateur (nom, email, password) VALUES (?, ?, ?)',
            [nom, email, hashedPassword]
        );
        const userId = result.insertId;

        // const token = jwt.sign(
        //     { id: user.id_admin, nom: user.nom, email: user.email},
        //     JWT_SECRET,
        //     { expiresIn: "2h" }
        // );
        res.status(201).json({
            message: "Inscription réussie",
            email: email
        });
    } catch (err) {
        console.error("Erreur lors de l'inscription:", err);
        res.status(500).json({ message: "Une erreur est survenue lors de l'inscription." });
    }
});


// --- Connexion ---
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "E-mail et mot de passe obligatoires." });
        }

        const [result] = await pool.query("SELECT * FROM administrateur WHERE email = ?", [email]);
        if (result.length === 0) {
            return res.status(401).json({ message: "E-mail ou mot de passe incorrect." });
        }

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: "E-mail ou mot de passe incorrect." });
        }

        const token = jwt.sign(
            { id: user.id_admin, nom: user.nom, email: user.email},
            JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.status(200).json({
            message: "Connexion réussie.",
            token: token,
            userId: user.id_admin,
           
        });
    } catch (err) {
        console.error("Erreur lors de la connexion:", err);
        res.status(500).json({ message: "Une erreur interne est survenue." });
    }
});

module.exports = router;
