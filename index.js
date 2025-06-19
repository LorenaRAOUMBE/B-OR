const dotenv = require("dotenv");
// Chargez les variables d'environnement dès le début de l'application
dotenv.config();

const express = require("express");
const cors = require("cors"); // Importation du middleware CORS

// Importez vos fichiers de routes ici
const categoriesRoute = require("./routes/categoriesRoute");
const clientsRoute = require("./routes/clientsRoute");
const administrateurRoute=require("./routes/administrateurRoute");
const produitsRoute=require("./routes/produitsRoute");
const commandesRoute=require('./routes/commandesRoute');
const authRoute=require("./routes/authenRoute")

// Initialisation de l'application Express
const app = express();

// --- Configuration des middlewares ---

app.use(cors ());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).send("Bienvenue sur l'API de votre application ! Le serveur est opérationnel.");
});



app.use("/",categoriesRoute);
app.use(clientsRoute);
app.use(administrateurRoute);
app.use(produitsRoute);
app.use(commandesRoute);
app.use(authRoute);

const Port= process.env.PORT

app.listen(Port,()=>{
    console.log("le server est a l ecoute sur http://localhost:"+Port);
   
})
