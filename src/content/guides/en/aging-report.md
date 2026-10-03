---
title: "Aging report in Excel: tracking unpaid invoices"
description: "Building an aging report in Excel: one line per invoice, four age bands, one action per band, twenty minutes a week. The method and a worked example in FCFA."
answer: "An aging report sorts your unpaid invoices by how long they are overdue: under 30 days, 30 to 60, 60 to 90, over 90. Kept in Excel and updated every week by one named person, it tells you who owes how much and since when, and sets this week’s action for each band."
lang: en
translationKey: balance-agee
pubDate: 2026-10-03
tools: ["relances", "calculateur"]
glossary: ["balance-agee", "delai-moyen-de-paiement", "mise-en-demeure", "retenue-de-garantie"]
demo: "balance-agee"
sources:
  - title: "Financial Afrik, “Cameroun : les retards de paiement dépassent 200 jours en 2025”, 26 February 2026 (in French)"
    url: "https://www.financialafrik.com/2026/02/26/cameroun-les-retards-de-paiement-depassent-200-jours-en-2025/"
---

In many SMEs, invoices sit in a binder, payments on the bank statement, and the reconciliation lives in the owner’s head. Nobody knows, on any given day, who owes how much and since when. The aging report solves this with a tool you already have: a spreadsheet. This guide explains how to build it, how to read it, and how to turn it into a twenty-minute weekly routine.

## What is an aging report?

It is the list of your unpaid invoices, sorted by how long they have been overdue. Four bands are usually used:

| Band | What it means | Typical action |
|---|---|---|
| **Under 30 days** | Recent delay, often an oversight or a slow approval circuit. | Polite reminder and confirmation of the payment date. |
| **30 to 60 days** | The delay is settling in. | Written reminder citing the penalty clause, then a call to the client’s accountant. |
| **60 to 90 days** | The invoice is becoming hard to collect. | Meeting with the finance director; new deliveries conditional on payment. |
| **Over 90 days** | Serious risk of non-payment. | Written formal notice; complete file ready for a lawyer if needed. |

The older an invoice gets, the harder it is to collect. The aging report is there to act while the invoice is still young.

## Which columns should the sheet have?

One line per invoice, with these columns:

1. **Client**
2. **Invoice number**
3. **Amount** in FCFA
4. **Date sent**
5. **Due date** (date sent + contract terms)
6. **Days overdue**: today’s date minus the due date (Excel formula: `=MAX(0,TODAY()-E2)`)
7. **Band**: calculated from the days overdue
8. **Last contact**: date and name of the person
9. **Next action**: what, who, when

For the band, one formula is enough: `=IF(F2=0,"Not due",IF(F2<30,"< 30 d",IF(F2<60,"30-60 d",IF(F2<90,"60-90 d","90 d +"))))`. A pivot table then gives the total by band and by client.

For construction clients, add a line for each retention, with its release date: it is the money people most often forget to claim.

[[cta]]

## How do you make it a routine?

An aging report is useless if nobody keeps it up to date. Three rules:

- **One named owner.** When it’s everyone’s job, it’s no one’s. One person updates the sheet.
- **Twenty minutes a week.** Same day, same time. Reconcile payments received, update the days overdue, decide the week’s actions.
- **One action per band.** The band decides the action, not the mood of the day. The reminder schedule provides the messages, from the D-5 reminder to the formal notice.

Once a month, calculate your average payment time from the same sheet. It is the number that tells you whether collection is improving.

## How do you read an aging report?

Look at the total per band first, then at the clients who account for most of the money.

- **Most of the money in “under 30 days”:** healthy, as long as reminders go out on fixed dates.
- **A growing “30 to 60 days” band:** your reminders arrive too late or don’t reach the right person.
- **One client weighing heavily in “over 90 days”:** that is a risk. Should you keep delivering? The question has to be asked.
- **Public clients in the older bands:** common. According to the Ministry of Finance, reported by Financial Afrik, the State took more than 200 days to pay its suppliers in 2025. Keep them separate to read the rest correctly.

## Do you need software?

No, not to start. An SME with 10 to 50 people rarely has more than a few dozen open invoices at any time: an Excel or Google Sheets file is enough, as long as it is updated every week. Invoicing software can produce the aging report automatically, but it doesn’t decide the actions and doesn’t chase anyone. The gain comes from the routine, not the tool.

Two simple precautions: one reference file, stored in a shared place, and a dated copy every month so you can compare.

## How do you start in one hour?

1. **Gather** the unpaid invoices: binder, invoicing software, emails sent.
2. **Tick off** the payments received on bank statements and Orange Money or MTN MoMo statements for the last three months.
3. **Enter** one line per invoice still due, with its real due date (the one in the contract, not the one you hoped for).
4. **Sort** by band with the formula, then by amount within each band.
5. **Decide** an action for every invoice more than 30 days overdue, with a name and a date.

The first time, the exercise almost always uncovers forgotten invoices: a credit note never issued, a retention never claimed, a partial payment never followed up.

A well-filled line looks like this:

```modele
Client: [Client name] | Invoice: F-[N] | Amount: [amount] FCFA | Sent: [date] | Due: [date] | Overdue: [N] d | Band: 30-60 d | Last contact: [date], [name], promised payment on [date] | Next action: call the accountant on [date], by [owner]
```

## Which mistakes should you avoid?

- **Mixing paid and unpaid invoices** in the same tab. The aging report only contains what is still owed.
- **Counting the delay from the invoice date** instead of the due date. A 30-day invoice is not late on day 20.
- **Not recording payment promises.** A broken promise is the most useful piece of information for the next reminder.
- **Forgetting partial payments.** The remaining balance needs its own line, with the same age as the original invoice.
- **Several people editing the sheet.** Two versions of the same file are two different truths.

## What should the owner see each month?

Three figures are enough, on half a page: the total owed per band, compared with the previous month; the five largest debtors and the planned action for each; the month’s average payment time. If the older bands shrink and the average payment time comes down, the work is paying off.

## Worked example

*Fictional example.* An SME has eight unpaid invoices totalling 22,750,000 FCFA. The demonstration below sorts them by band: 5,550,000 FCFA under 30 days, 8,900,000 FCFA between 30 and 60 days, 4,350,000 FCFA between 60 and 90 days, 3,950,000 FCFA over 90 days. Click a band to see the invoices concerned and this week’s action. The two oldest bands, 8,300,000 FCFA in total, come first.
