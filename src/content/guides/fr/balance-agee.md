---
title: "Balance âgée sur Excel : le guide du suivi des impayés"
description: "Construire une balance âgée sur Excel : une ligne par facture, quatre tranches d’âge, une action par tranche, vingt minutes par semaine. Méthode et exemple."
answer: "Une balance âgée classe vos factures impayées par ancienneté du retard : moins de 30 jours, 30 à 60, 60 à 90, plus de 90. Tenue sur Excel, mise à jour chaque semaine par une personne nommée, elle dit qui vous doit combien et depuis quand, et fixe l’action de la semaine pour chaque tranche."
lang: fr
translationKey: balance-agee
pubDate: 2026-10-03
tools: ["relances", "calculateur"]
glossary: ["balance-agee", "delai-moyen-de-paiement", "mise-en-demeure", "retenue-de-garantie"]
demo: "balance-agee"
sources:
  - title: "Financial Afrik, « Cameroun : les retards de paiement dépassent 200 jours en 2025 », 26 février 2026"
    url: "https://www.financialafrik.com/2026/02/26/cameroun-les-retards-de-paiement-depassent-200-jours-en-2025/"
---

Dans beaucoup de PME, les factures sont dans un classeur, les paiements sur le relevé bancaire, et le rapprochement dans la tête du dirigeant. Personne ne sait, à un jour donné, qui doit combien et depuis quand. La balance âgée règle ce problème avec un outil que vous avez déjà : un tableur. Ce guide explique comment la construire, comment la lire, et comment en faire une routine de vingt minutes par semaine.

## Qu’est-ce qu’une balance âgée ?

C’est la liste de vos factures impayées, classées selon l’ancienneté de leur retard. On utilise en général quatre tranches :

| Tranche | Ce qu’elle signifie | Action type |
|---|---|---|
| **Moins de 30 jours** | Retard récent, souvent un oubli ou un circuit de validation lent. | Rappel courtois et confirmation de la date de paiement. |
| **30 à 60 jours** | Le retard s’installe. | Relance écrite qui rappelle la clause de pénalité, puis appel au comptable du client. |
| **60 à 90 jours** | La facture devient difficile à faire payer. | Rendez-vous avec le directeur financier ; nouvelles livraisons conditionnées au règlement. |
| **Plus de 90 jours** | Risque sérieux de non-paiement. | Mise en demeure écrite ; dossier complet prêt pour un avocat si nécessaire. |

Plus une facture vieillit, plus elle est difficile à faire payer. La balance âgée sert à agir tant que la facture est encore jeune.

## Quelles colonnes mettre dans le tableau ?

Une ligne par facture, et ces colonnes :

1. **Client**
2. **Numéro de facture**
3. **Montant** en FCFA
4. **Date d’envoi** de la facture
5. **Échéance** (date d’envoi + délai prévu au contrat)
6. **Jours de retard** : la date du jour moins l’échéance (formule Excel : `=MAX(0;AUJOURDHUI()-E2)`)
7. **Tranche** : calculée à partir des jours de retard
8. **Dernier contact** : date et nom de l’interlocuteur
9. **Prochaine action** : quoi, qui, quand

Pour la tranche, une formule suffit : `=SI(F2=0;"À échoir";SI(F2<30;"< 30 j";SI(F2<60;"30-60 j";SI(F2<90;"60-90 j";"90 j et +"))))`. Un tableau croisé dynamique donne ensuite le total par tranche et par client.

Pour les clients du BTP, ajoutez une ligne pour chaque retenue de garantie, avec sa date de libération : c’est l’argent qu’on oublie le plus souvent de réclamer.

[[cta]]

## Comment en faire une routine ?

La balance âgée ne sert à rien si elle n’est pas tenue. Trois règles :

- **Un responsable nommé.** Quand c’est tout le monde, ce n’est personne. Une seule personne met le tableau à jour.
- **Vingt minutes par semaine.** Le même jour, à la même heure. On rapproche les paiements reçus, on met à jour les jours de retard, on décide les actions de la semaine.
- **Une action par tranche.** La tranche décide de l’action, pas l’humeur du jour. Le calendrier de relances fournit les messages, du rappel à J-5 à la mise en demeure.

Une fois par mois, calculez votre délai moyen de paiement à partir du même tableau. C’est le chiffre qui dit si votre encaissement s’améliore.

## Comment lire la balance âgée ?

Regardez d’abord le total par tranche, puis les clients qui concentrent les montants.

- **Beaucoup de montants dans « moins de 30 jours » :** c’est sain, tant que les relances partent à date fixe.
- **Une tranche « 30 à 60 jours » qui grossit :** vos relances arrivent trop tard ou ne visent pas le bon interlocuteur.
- **Un seul client dans « plus de 90 jours » qui pèse lourd :** c’est un risque. Faut-il continuer à livrer ? La question doit être posée.
- **Des clients publics dans les tranches anciennes :** c’est fréquent. Selon le ministère des Finances, cité par Financial Afrik, l’État a mis plus de 200 jours à payer ses prestataires en 2025. Isolez-les pour lire correctement le reste.

## Faut-il un logiciel ?

Non, pas pour commencer. Une PME de 10 à 50 personnes a rarement plus de quelques dizaines de factures ouvertes en même temps : un classeur Excel ou Google Sheets suffit, à condition d’être tenu chaque semaine. Un logiciel de facturation peut produire la balance âgée automatiquement, mais il ne décide pas des actions et ne relance personne. Le gain vient de la routine, pas de l’outil.

Deux précautions simples : un seul fichier de référence, stocké à un endroit partagé, et une copie datée chaque mois pour pouvoir comparer.

## Comment démarrer en une heure ?

1. **Rassemblez** les factures non payées : classeur, logiciel de facturation, e-mails envoyés.
2. **Pointez** les paiements reçus sur les relevés bancaires et les relevés Orange Money ou MTN MoMo des trois derniers mois.
3. **Saisissez** une ligne par facture encore due, avec son échéance réelle (celle du contrat, pas celle que vous espériez).
4. **Classez** par tranche avec la formule, puis triez par montant à l’intérieur de chaque tranche.
5. **Décidez** une action pour chaque facture de plus de 30 jours, avec un nom et une date.

La première fois, l’exercice révèle presque toujours des factures oubliées : un avoir jamais émis, une retenue jamais réclamée, un paiement partiel jamais relancé.

Une ligne bien remplie ressemble à ceci :

```modele
Client : [Nom du client] | Facture : F-[N] | Montant : [montant] FCFA | Envoyée le : [date] | Échéance : [date] | Retard : [N] j | Tranche : 30-60 j | Dernier contact : [date], [nom], promesse de paiement au [date] | Prochaine action : appel au comptable le [date], par [responsable]
```

## Quelles erreurs éviter ?

- **Mélanger les factures payées et impayées** dans le même onglet. La balance âgée ne contient que ce qui est encore dû.
- **Calculer le retard depuis la date de facture** au lieu de l’échéance. Une facture à 30 jours n’est pas en retard au 20e jour.
- **Ne pas noter les promesses de paiement.** Une promesse non tenue est l’information la plus utile pour la relance suivante.
- **Oublier les paiements partiels.** Le reste dû doit apparaître sur sa propre ligne, avec la même ancienneté que la facture d’origine.
- **Tenir le tableau à plusieurs.** Deux versions du même fichier, c’est deux vérités différentes.

## Que présenter au dirigeant chaque mois ?

Trois chiffres suffisent, sur une demi-page : le total dû par tranche, comparé au mois précédent ; les cinq plus gros débiteurs et l’action prévue pour chacun ; le délai moyen de paiement du mois. Si le total des tranches anciennes baisse et que le délai moyen recule, le travail porte.

## Exemple chiffré

*Exemple fictif.* Une PME a huit factures impayées pour un total de 22 750 000 FCFA. La démonstration ci-dessous les classe par tranche : 5 550 000 FCFA à moins de 30 jours, 8 900 000 FCFA entre 30 et 60 jours, 4 350 000 FCFA entre 60 et 90 jours, 3 950 000 FCFA au-delà de 90 jours. Cliquez sur une tranche pour voir les factures concernées et l’action de la semaine. Les deux dernières tranches, soit 8 300 000 FCFA, passent en priorité.
