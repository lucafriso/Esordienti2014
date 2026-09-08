# CalcioTeam PWA

Web app installabile per la gestione di una squadra di calcio. Non richiede server o database: i dati vengono salvati nel browser del dispositivo.

La formazione è configurata per una squadra **Esordienti a 9**, con selezione di nove titolari e moduli 3-3-2, 3-2-3 e 2-3-3.

## Pubblicazione su GitHub Pages (metodo consigliato)

1. Crea un nuovo repository su GitHub, ad esempio `calcioteam`.
2. Carica nel repository l'intero contenuto di questo progetto.
3. In GitHub apri **Settings → Pages**.
4. In **Build and deployment**, scegli **GitHub Actions**.
5. Se il branch si chiama `main`, la pubblicazione partirà automaticamente a ogni aggiornamento.
6. Apri la sezione **Actions** per seguirne l'avanzamento. Dopo qualche minuto GitHub mostrerà l'indirizzo pubblico del sito.

In alternativa, puoi copiare il solo contenuto di `dist` nella radice del repository e scegliere **Deploy from a branch → main → / (root)**.

La configurazione usa esclusivamente percorsi relativi e funziona quindi anche all'indirizzo `https://nomeutente.github.io/calcioteam/`.

## Installazione su iPhone

1. Apri l'indirizzo GitHub Pages usando **Safari**.
2. Tocca il pulsante **Condividi**.
3. Scegli **Aggiungi alla schermata Home**.
4. Conferma con **Aggiungi**.

## Dati e backup

I dati rimangono nel browser dell'iPhone. Da **Impostazioni** è possibile creare un backup JSON e ripristinarlo in seguito. L'app mostra un promemoria quando non è mai stato creato un backup o quando l'ultimo risale a più di sette giorni fa.

Su iPhone, dopo aver premuto **Backup**, salva il file nell'app **File**, preferibilmente in iCloud Drive. La cancellazione dei dati del browser può eliminare l'archivio locale; in quel caso basta riaprire l'app, scegliere **Impostazioni → Ripristina** e selezionare il file JSON.

## Sviluppo locale

Per provare offline e Service Worker è necessario servire `dist` via HTTP, ad esempio:

```bash
python3 -m http.server 8080 --directory dist
```

Poi apri `http://localhost:8080`.
