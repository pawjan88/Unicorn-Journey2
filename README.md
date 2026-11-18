# Tęczowa Przygoda Jednorożca

Kompletna platformówka 2D dla najmłodszych, po polsku. Phaser 3, TypeScript i Vite, bez serwera danych i kont graczy.

## Uruchomienie

Wymagany Node.js 22.12 lub nowszy.

```sh
npm ci
npm run dev
```

Otwórz adres wskazany przez Vite. Telefon w tej samej sieci może użyć adresu sieciowego wskazanego przez Vite.

```sh
npm test
npm run build
```

Folder `dist/` można udostępnić na dowolnym hostingu statycznym. Gra powinna działać przez HTTP lub HTTPS.

## Sterowanie

- Strzałki ← / →: ruch i natychmiastowe zatrzymanie po puszczeniu.
- Spacja: skok w miejscu, około 82 jednostki wysokości.
- Strzałka przy wybiciu + spacja: skok około 175 jednostek wysokości i 300 zasięgu.
- Ctrl (lewy lub prawy): tęczowa kulka w stronę, w którą patrzy jednorożec. Przytrzymanie strzela seriami, bez limitu amunicji.
- Cztery przyciski dotykowe: ←, →, Skok i Kulka, niezależne identyfikatory palców i przechwytywanie wskaźnika. Ruch, skok i strzał mogą działać jednocześnie.
- Escape: pauza. Dźwięki można wyłączyć w nagłówku.

## Zasady

Cztery mapy są ponad dwukrotnie dłuższe niż w pierwszej wersji: 6600, 7000, 7000 i 7600 jednostek. Każda ma trzy Super Tęcze, trzy patrolujące trolle, dwa gejzery i nowe schodkowe podejścia na wysokie platformy. Łącznie jest 451 gwiazdek, 12 Super Tęcz, 12 trolli i 8 gejzerów. Gwiazdka daje 1 punkt, tęcza 10. Każdy przedmiot ma stały identyfikator, więc nie nalicza się drugi raz po powrocie na mapę. Wynik, ukończone mapy, odprawione trolle, stan podpowiedzi i dźwięku zapisują się lokalnie w przeglądarce, pod kluczem `teczowa-przygoda-v1`. Zapis nie synchronizuje się pomiędzy urządzeniami. Przy zablokowanym localStorage gra zachowuje postęp w pamięci do zamknięcia strony.

Po upadku postać wraca do ostatniego bezpiecznego lądowania, bez utraty skarbów. Meta odblokowuje kolejną mapę po odprawieniu wszystkich trzech trolli z tej krainy, bez wymogu zebrania wszystkich przedmiotów. Wszystkie mapy, dwanaście tęcz i odprawienie wszystkich trolli uruchamiają wspólną panoramę czterech krain pod wielką tęczą. Dotychczasowe identyfikatory znajdziek, punkty i odblokowane mapy pozostają zgodne ze starymi zapisami.

Gejzery mają okres 4,5 sekundy: wybuch przez 1,35 sekundy, spokojną przerwę oraz bulgotanie ostrzegające przed wybuchem. Aktywny strumień i dotknięcie trolla przenoszą do ostatniego bezpiecznego lądowania. Punkt odrodzenia nie zapisuje się przy niebezpiecznym gejzerze ani na drodze trolla. Po odrodzeniu postać przez chwilę chroni pierścień, a jednorożec zachowuje pełną widoczność. Tęczowe kulki poruszają się w obie strony, znikają po trafieniu lub po 1,1 sekundy i nie przechodzą przez solidne pnie i kamienne platformy. Pokonane trolle pozostają odprawione po upadku i powrocie na mapę. Nie ma zegara ani licznika żyć.

## Ponowne granie

Przycisk **Od nowa** przy karcie krainy, w pauzie i po jej ukończeniu przywraca gwiazdki, tęcze i trolle tylko w tej krainie. Punkty z jej poprzedniej próby są odejmowane, a pozostałe krainy zachowują postęp i dostęp. Odblokowane mapy zapisują się oddzielnie od ukończonych, więc restart wcześniejszej trasy nie blokuje kolejnych.

**Od nowa — cała przygoda** w menu i po czwartej trasie rozpoczyna nową grę na Kwiatowej Łące: zeruje skarby, wynik, trolle i ukończenia, a kolejne mapy ponownie odblokowuje się po mecie. Ustawienie dźwięku zostaje. Po pełnym tęczowym finale także główny przycisk zmienia się na **Od nowa**. Zwykłe **Wróć do krainy** zachowuje zebrane skarby i służy do uzupełniania braków.

## Budowa

- `src/game/levels.ts`: dane map, platformy i stałe identyfikatory skarbów.
- `src/game/simulation.ts`: symulacja 120 Hz, kolizje, skoki, odrodzenie i zdarzenia.
- `src/game/encounters.ts`: cykle gejzerów, patrolowanie, tęczowe kulki, trafienia i bezpieczne odrodzenie.
- `src/game/progress.ts`: wynik, odblokowywanie i zapis.
- `src/game/input.ts`: wspólne akcje klawiatury i wielodotyku.
- `src/game/scene.ts`: scena Phasera, kamera, animacje i efekty.
- `src/game/assets.ts`: manifest lokalnych tekstur WebP używanych przez Phaser i menu.
- `tests/startup.test.mjs`: uruchomienie produkcyjnego pakietu w emulatorze DOM, z rzeczywistym silnikiem Phasera i zastąpionymi operacjami rysowania.
- `src/ui/art.ts`: wektorowe ikony interfejsu.
- `public/art/`: panoramy krain, animowane postacie, podesty i skarby w formacie WebP.
- `src/game/scenery.ts`: warstwy panoramy, tekstury terenu, gejzery, punkty kontrolne i meta.
- `src/main.ts`, `src/style.css`: dostępny interfejs DOM, mapy, HUD i okna.

Fonty Nunito i Fraunces są dostarczone lokalnie na licencji SIL Open Font License. Brak zewnętrznych obrazków i zależności CDN w uruchomionej grze. Dźwięki powstają lokalnie przez Web Audio. Interfejs respektuje preferencję ograniczenia dodatkowych animacji; animowane instrukcje pozostają częścią nauki sterowania.

Łącznie 41 testów sprawdza wszystkie znajdźki i podesty, oba typy skoku, zatrzymywanie i cofanie, przerwy w obu kierunkach, zapis po upadku, unikalność punktacji, odblokowanie i finał oraz równoczesny dotyk strzałki i skoku. Dodatkowe testy weryfikują pliki WebP, ich przezroczystość i jednolite wymiary kolejnych klatek, uruchamiają wszystkie cztery mapy z pakietu produkcyjnego i sprawdzają menu, pauzę oraz odzyskanie działania po błędzie inicjalizacji. Testy obejmują również wszystkie nowe stopnie platform, migrację zapisów, cykle gejzerów, trafienia i zapis trolli, strzały w obie strony, Ctrl i wielodotyk oraz pełną widoczność postaci po kilku upadkach w trzeciej krainie. Testy weryfikują także ponowne uruchomienie każdej ukończonej mapy, niezależny reset jej punktów i trolli, trwałość odblokowań po odświeżeniu, pełny restart po czwartej trasie i po tęczowym finale oraz przywrócenie zwykłego menu. Testy DOM zastępują rysowanie, więc nie potwierdzają wyglądu gry. Pełny wizualny test przeglądarkowy pozostaje do wykonania: środowisko tej sesji nie udostępniało narzędzia `cua_repl.js` wymaganego do zarządzanego podglądu.
