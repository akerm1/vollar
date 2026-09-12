# ♻️ Récupération des données — Vollar POS

Guide pas à pas pour retrouver vos données (produits, ventes, clients, stock, dépenses) après un incident.

---

## Règle d'or

> **On ne récupère que ce dont on a une sauvegarde.** L'application enregistre tout dans la base locale (IndexedDB). Chaque sauvegarde exportée est un fichier `.json` **complet** (les 13 magasins de données). Gardez toujours au moins une copie **hors du PC** (clé USB, disque externe, dossier synchronisé).

---

## Où sont les fichiers de sauvegarde ?

| Nom du fichier | Origine | Emplacement |
|---|---|---|
| `sauvegarde_YYYY-MM-DD.json` | Export manuel (bouton **Export JSON** dans Paramètres) | le dossier « Téléchargements » |
| `backup_YYYY-MM-DDTHH-MM.json` | Export automatique horaire | le **dossier d'export** choisi dans Paramètres |
| `backup_SHUTDOWN_YYYY-MM-DDTHH-MM-SS.json` | Sauvegarde automatique **à la fermeture** de l'application | le dossier d'export, sinon le **Bureau** |

💡 Dans Paramètres, la section **♻️ Restaurer une sauvegarde** liste automatiquement les fichiers trouvés (dossier d'export + Bureau), du plus récent au plus ancien.

---

## Scénario 1 — Les données ont disparu / écran vide

1. Ouvrez **Paramètres** → section **♻️ Restaurer une sauvegarde**.
2. Cliquez sur **Actualiser** : la liste des sauvegardes trouvées s'affiche.
3. Choisissez la sauvegarde **la plus récente** et cliquez **Restaurer**.
4. Confirmez le remplacement. L'application **vérifie le fichier**, **sauvegarde l'état actuel** (annulable) puis restaure.

Si la liste est vide (aucune sauvegarde dans le dossier d'export ni sur le Bureau) :
- cherchez un fichier `sauvegarde_*.json` ou `backup_*.json` sur le PC (Téléchargements, Documents) ;
- utilisez le bouton **Import JSON** des Paramètres (section Sauvegarde) pour choisir le fichier à la main.

## Scénario 2 — Après une restauration ratée / des données incohérentes

1. **N'écrasez rien.** Faites d'abord un **Export JSON** de l'état actuel (même abîmé) : il servira de filet de sécurité.
2. Restaurez ensuite la sauvegarde la plus récente **antérieure** au problème.
3. ⚠️ Tout ce qui a été créé **après** cette sauvegarde (ventes, stocks, clients) est perdu — c'est pour cela qu'on exporte d'abord l'état actuel.

## Scénario 3 — Le PC est mort / remplacé

1. Installez Vollar POS sur le nouveau PC.
2. Récupérez le fichier de sauvegarde le plus récent depuis votre copie externe (clé USB, cloud).
3. Ouvrez l'application → **Paramètres** → **Import JSON** → choisissez le fichier → confirmez.
4. Vérifiez : produits, clients, historique des ventes, dépenses sont revenus.

## Scénario 4 — Aucun fichier de sauvegarde du tout (dernier recours)

La base de données brute existe encore sur le disque tant que le dossier utilisateur n'a pas été supprimé :

1. Fermez complètement l'application.
2. Appuyez sur **Win + R**, tapez `%APPDATA%` puis Entrée.
3. Ouvrez le dossier **Vollar POS** (version installée) — la base est dans le sous-dossier `IndexedDB`.
4. **Copiez tout le dossier** `Vollar POS` en lieu sûr (clé USB).
5. Contactez le support / un développeur avec cette copie : les enregistrements peuvent en être extraits et re-transformés en sauvegarde `.json` importable.

---

## Ce qu'il faut savoir avant de restaurer

- La restauration **remplace** les magasins de données présents dans le fichier (pas de fusion). Un fichier qui ne contient que les produits ne touchera pas les ventes ou les clients.
- Le fichier est **validé** avant toute écriture ; en cas d'échec en cours de route, l'état précédent est **remis automatiquement** (annulation).
- Le fichier **CSV** d'export des ventes (`ventes_export_*.csv`) est une **référence de lecture uniquement** : il ne peut pas être réimporté.
- Les utilisateurs/PIN font partie de la sauvegarde complète : vos profils de connexion reviennent avec elle.

## Se prémunir pour la prochaine fois (2 minutes)

1. **Activez l'export horaire** : Paramètres → 📁 **Choisir le dossier d'export** → cochez l'option d'export automatique.
2. **Choisissez un dossier hors du disque C:** (clé USB dédiée, disque externe ou dossier synchronisé OneDrive/Google Drive).
3. **Testez une fois** : exportez, puis restaurez cette sauvegarde sur une installation de test pour vérifier que tout revient.
