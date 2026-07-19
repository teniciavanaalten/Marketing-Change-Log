# Melon — Marketing Master Dashboard

Eén dashboard voor al je marketingdata. Log wijzigingen (campagne live, budget aangepast, nieuwe creative) en zie ze als markers over je performance-grafieken heen, zodat je zelf verbanden kunt spotten: "ik zette op 3 juni een LinkedIn-campagne live — wat gebeurde er daarna met mijn andere cijfers?"

**Nu:** change log + CSV-import + grafiek met event-overlay (LinkedIn / Google / Meta / eigen platforms).
**Richting:** directe API-koppelingen (LinkedIn Ads, Google Ads, Google Analytics) zodat alle databronnen op één tijdlijn samenkomen. Geen AI-laag — jij beoordeelt de data zelf.

## Starten

Vereist: Node.js

```bash
npm install
npm run dev
```

Bouwen voor productie: `npm run build`

## Let op

Data wordt nog **niet opgeslagen** — alles staat in het geheugen en is weg na een refresh. Persistentie is de eerstvolgende stap (zie CLAUDE.md voor de technische stand van zaken).
