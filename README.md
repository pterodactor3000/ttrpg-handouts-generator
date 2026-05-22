# Handout manager

- Dla zalogowanego użytkownika
- Wybór między rodzajami settingów (high/dark fantasy, sci-fi, grimdark, etc.)
- Bazowe opcje: tekstowe (list, notatka, książka, etc.), z grafiką na środku (typu list gończy)
- Kategoryzacja (tagi?) handoutów
- Share hadnoutów (jako pdf - offline dostęp, lub html - online dostęp)
- Tylko zalogowany i twórca może generować share link i zarządzać handoutami (usuwać, edytować)
- Wybór z kilku open source fontów
- Bazowa lista tła dla handoutu (list, ekran, etc.)
- Twórca może dodać swoje tło
- Każdy z linkiem może zobaczyć
- Możliwość tłumaczenia AI na szybko


Kryterium | Dobry projekt | Zły projekt | Pytanie kontrolne
Użytkownik | Wiesz, kto używa aplikacji i po co | „Dla wszystkich” | Kto jest adresatem pierwszej akcji?
Problem | Jeden konkretny ból lub potrzeba | Ogólna platforma do wszystkiego | Jaki konkretny problem rozwiązuje aplikacja?
MVP | 1-2 kluczowe przepływy | Lista funkcji jak roadmapa produktu | Co powinno zadziałać w pierwszym tygodniu?
Dane | Dane wynikają z domeny | Sztuczny CRUD doklejony do wymagań | Co użytkownik tworzy lub aktualizuje?
Logika biznesowa | Aplikacja podejmuje decyzję domenową | Rekordy tylko leżą w bazie | Jaką regułę działania da się opisać jednym zdaniem?
Stack | Znany, oparty o konwencje, dobrze udokumentowany | Niszowy albo wybrany tylko z ciekawości | Czy agent i ty macie dość kontekstu?
Test | Da się przetestować główny przepływ | Test nie ma czego sensownie sprawdzić | Co musi przejść, żeby projekt uznać za sprawny?
CI/CD | Build i testy da się uruchomić automatycznie | Projekt wymaga postawienia całej infrastruktury | Czy repo może samo sprawdzić podstawową jakość?

user - gracze ttrpg
problem - managing i sharing handoutów
mvp - generowanie handoutu, export do pliku
dane - user, markdown tekst?, blob z grafiką tła
logika biznesowa - 
stack - react
test - user generuje handout, handout jest pobrany do pliku
ci/cd - albo cloudflare albo github pages