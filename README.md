# Teilen

Rechnung auf dem iPhone aufteilen. Trinkgeld, centgenaue Anteile und Aufrunden auf 50 Cent oder 1 Euro. Die Summe der Anteile bleibt nachvollziehbar, und nach dem Hinzufügen zum Home-Bildschirm funktioniert die Seite offline.

## Lokal öffnen

```bash
python3 scripts/serve.py
```

Am Rechner: [http://127.0.0.1:3000](http://127.0.0.1:3000)

Auf dem iPhone dieselbe Adresse mit der IP des Rechners im gleichen WLAN öffnen, in Safari. Dann **Teilen → Zum Home-Bildschirm**. `localhost` auf dem iPhone meint das Telefon selbst, nicht den Rechner.

## Rechnen prüfen

```bash
node --test tests/calc.test.js
```
