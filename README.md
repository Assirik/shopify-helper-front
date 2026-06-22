# Assirik Helpdesk Frontend

Frontend métier Vue 3 et Vuetify pour traiter les commandes Shopify nécessitant une décision humaine.

## Prérequis

- Node.js compatible avec Vite 6 ;
- backend Assirik démarré ;
- Redis et MongoDB Atlas disponibles côté backend ;
- au moins un utilisateur helpdesk actif.

## Configuration

Créer le fichier `.env` local à partir de `.env.example` :

```env
VITE_API_BASE_URL=http://localhost:3600/api
```

Seules les valeurs publiques nécessaires au navigateur doivent utiliser le préfixe `VITE_`. Aucun secret JWT, Shopify, Meta, Termii, Redis ou Atlas ne doit être placé dans ce projet.

Le backend doit autoriser l'origine locale :

```env
ALLOWED_ORIGINS=http://localhost:5173
```

## Démarrage

```bash
npm install
npm run dev
```

Application locale : `http://localhost:5173`.

## Authentification

Le formulaire accepte le nom d'utilisateur ou l'email. Le JWT est conservé dans `localStorage`, validé par `GET /api/auth/me` au démarrage et supprimé lors d'un `401`, d'une déconnexion ou d'un changement de mot de passe.

Une route protégée conserve son URL dans le paramètre `redirect`. La destination par défaut est temporairement `/a-traiter` tant que le dashboard final n'est pas disponible.

Le menu utilisateur permet de changer son mot de passe. Après succès, toutes les sessions sont révoquées et une nouvelle connexion est obligatoire.

## File « À traiter »

La page consomme exclusivement `GET /api/orders/attention`. Elle fournit :

- filtres et compteurs par raison ;
- pagination serveur ;
- sélection limitée à la page courante ;
- capacités d'action calculées par le backend ;
- confirmation, relance et annulation unitaires ;
- confirmation et relance groupées ;
- gestion des résultats partiels HTTP `207` ;
- badge de file partagé dans la sidebar.

L'annulation exige un motif. Le texte final envoyé à l'API ne dépasse pas 500 caractères.

## Validation frontend

```bash
npm run type-check
npm run build
npm run preview
```

Recette manuelle minimale :

1. vérifier login par nom utilisateur et email ;
2. recharger une session authentifiée ;
3. vérifier redirection et déconnexion ;
4. changer le mot de passe puis se reconnecter ;
5. tester chaque filtre et la pagination ;
6. tester les actions autorisées et leurs erreurs ;
7. tester un bulk complet et un bulk partiel ;
8. vérifier le dialog d'annulation ;
9. vérifier palettes claire/sombre à 1440x900 et 1280px.

## Ordre de déploiement

1. déployer le backend et ses nouveaux contrats ;
2. exécuter le backfill Atlas dans une fenêtre contrôlée ;
3. vérifier Swagger et la file avec Postman ;
4. configurer `VITE_API_BASE_URL` vers l'API HTTPS ;
5. construire et déployer le frontend ;
6. effectuer la recette manuelle.
