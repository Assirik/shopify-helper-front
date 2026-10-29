# CLAUDE.md — shopify-helper-front

Interface du helpdesk « ecom_helper » : `src/` (Vue 3, Vuetify 3, Pinia, TypeScript, Vite),
déployée sur Netlify (`netlify.toml`). Elle consomme l'API du dépôt `shopify-helper-back`
(`VITE_API_BASE_URL`) ; les types de `src/types/*.ts` et les libellés de
`src/constants/status.ts` recopient à la main les enums du backend. Pas de tests
automatisés ni de CI : la vérification est locale.

## Démarrer

```bash
npm ci
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:3600/api pour l'API locale
npm run dev               # Vite, port 5173
```

Le serveur Vite de l'humain (port 5173) sert le checkout principal : travailler dans un
worktree (`.claude/worktrees/<tâche>`) et lancer son propre serveur sur un autre port
(`npm run dev -- --port 5180`).

## Commandes

```bash
npm run type-check   # vue-tsc --noEmit : la vérification minimale
npm run build        # type-check + build de production
```

Pas de lint configuré.

## Front — ce qui casse en silence

**Enums recopiés du backend.** Une valeur ajoutée côté backend (motif « À traiter »,
statut, type d'événement) doit être ajoutée au type (`src/types/*.ts`), à son libellé
(`src/constants/status.ts` ou la table locale de la vue) et, pour un motif « À traiter »,
aux compteurs du store (`src/stores/attention.ts`, `emptyCounts`) et aux onglets de
`src/views/ATraiterView.vue` (`reasons`, `filters`). Sinon l'élément n'a ni onglet ni
libellé, sans aucune erreur.

**Appels API.** Passer par un service `src/services/*.service.ts` (instance `api` de
`src/services/api.ts`). Les erreurs se traduisent avec `toApiFailure`
(`src/services/errors.ts`) et, pour les actions sur une commande,
`src/utils/orderErrors.ts`. Pas d'appel HTTP direct depuis une vue.

**Textes.** L'interface est en français, avec les termes déjà employés dans les écrans
voisins.

## Vérification visuelle

Le Playwright du serveur MCP plante (erreur GTK) : piloter Chrome avec un script
`playwright-core` en mode headless. Pour afficher un état que l'API locale ne produit pas
encore, intercepter ses réponses dans le script (`page.route`). Compte de test : le
demander à l'humain, ne jamais l'écrire dans un fichier.

## Critères hors du cas normal

- Erreur de l'API → message lisible, l'écran reste utilisable.
- Action en cours → bouton désactivé ou indicateur, pas de double envoi.
- Liste vide → état vide explicite.
- Valeur inconnue venue du backend (enum plus récent) → libellé de repli, pas de plantage.
- Largeur mobile → pas de débordement horizontal.

## Git, commits, PR

- **Langue** : code, commentaires et messages de commit en anglais ; textes visibles par
  l'utilisateur, documentation et PR en français.
- **Branches** : depuis `dev`, une par tâche : `feature/<id>-<sujet>`, `fix/<sujet>`,
  `chore/<sujet>` (ex. `feature/c5-8-capi-status-screens`).
- **Message de commit** : Conventional Commits, scope `front` (`feat(front): add …`). Corps :
  le pourquoi. Pour une tâche de mission tech lead, pied de page `Tâche:`, `Agent:`,
  `Review:`, puis la ligne `Co-Authored-By`.
- **Description de PR**, vers `dev` : `## Contexte` (carte Trello), ce qui change,
  `## Vérifications` (commandes, captures), points d'attention ; dernière ligne
  d'attribution. Modèle : PR #10.
- **Fusion** : par l'humain uniquement. Commit, push de branche et ouverture de PR sont
  permis ; jamais de fusion.
- **Trello** (tableau ecom_helper) : la carte passe en « En Cours » au démarrage, en
  « En validation » à l'ouverture de la PR, en « Terminés » une fois fusionnée.
- **Preuve attendue** : sortie réelle de `npm run build` ; pour un écran, une capture de
  l'état concerné.

## Où regarder

- Cartes Trello du tableau ecom_helper — le détail de chaque tâche ; la carte fait foi.
- `../docs/SPEC_MASTER_ecom_helper.md` (hors dépôt) — spécification de référence.
- `../docs/CHANTIER5_PROPOSITIONS_MAJ.md` (hors dépôt) — décisions du Chantier 5.
- `../techlead/<mission>/` (hors dépôt) — PLAN et JOURNAL des missions tech lead.
