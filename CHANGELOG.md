# Changelog

Alle relevanten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
und Versionen folgen [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Planned
- Kleine UX-Verbesserungen im Form-Modal und in der mobilen Navigation.
- Erweiterte Validierung für Import-Dateien.

## [1.1.1] - 2026-03-06

### Changed
- In der mobilen Ansicht die Seitenüberschrift im Tab `Stats` (Icon + Text `Erweiterte Statistiken`) ausgeblendet.
- In der mobilen Ansicht die Seitenüberschrift im Tab `Setup` (Icon + Text `Einstellungen`) ausgeblendet.
- In der mobilen Ansicht die Seitenüberschrift im Tab `Hilfe` (Icon + Text `Hilfe & Anleitungen`) ausgeblendet.
- Logo in der mobilen Header-Ansicht leicht verkleinert.
- Meta-Tags im `index.html` auf eine vollständige SEO-/Social-Preview-Struktur erweitert (u. a. `description`, `canonical`, Open Graph, Twitter Cards).

## [1.1.0] - 2026-03-05

### Added
- Mehrseiten-Navigation mit `Dashboard`, `Statistiken`, `Einstellungen` und `Hilfe`.
- Kanban-Ansicht mit Drag-and-Drop für Statuswechsel.
- Follow-up- und Favoriten-Filter im Dashboard.
- In-App-Erinnerungen für Termine und Follow-ups.
- JSON-Backup (Export/Import inkl. Einstellungen).
- PDF-Export auf Basis von `template.pdf`.
- Erweiterte Detailverwaltung pro Bewerbung:
  - Dokumente
  - Termine
  - Links
  - Timeline-Ereignisse

### Changed
- Responsives Layout für Desktop und Mobile deutlich ausgebaut.
- Dark-Mode-Unterstützung inkl. persistierter Theme-Auswahl.
- Statistikbereich mit Aktivitätszeitraum und Kanal-Auswertung erweitert.
- Tabellen- und Karten-Rendering für größere Datensätze optimiert.

### Fixed
- Datumsmigration für bestehende Datensätze verbessert.
- Robustere Behandlung von leeren Feldern und optionalen Werten.
- Sicherere Ausgabe von Nutzereingaben via Escape-Helfer.

### Documentation
- `README.md` erstellt/aktualisiert.
- `LICENSE` auf MIT gesetzt.
- `CHANGELOG.md` eingeführt.

## [1.0.0] - 2025-12-13

### Added
- Initiale Version von Jobmate mit Bewerbungsverwaltung und lokaler Speicherung.
