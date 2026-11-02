# Innovation NFC — HR Management & NFC Access Dashboard

A fully static HR operations dashboard built with vanilla HTML, CSS and JavaScript. It combines employee management, attendance, NFC access simulation, meetings, support tickets, NFC card management, reports and native PowerPoint export in one responsive web application.

[**Open the live demo**](https://AdrianChavezHuaman.github.io/innovation-nfc-dashboard/)

> Demo project with simulated data. Every visitor has an independent copy in the browser's `localStorage`; nothing is sent to a server.

## Demo Access

| Role | User | Email | Password |
|---|---|---|---|
| Owner | `achavezh` | `achavezh@innovation.nfc.esf` | `huaman123` |
| Management | `jalarconr` | `jalarconr@innovation.nfc.esf` | `riquelme123` |
| HR | `zbordav` | `zbordav@innovation.nfc.esf` | `velazque123` |

The **Owner** account can explore every module. Management and HR accounts demonstrate role-based access control.

## Highlights

- **Role-based dashboard** for Owner, Management and HR.
- **Panel** with attendance, weekly hours, recent check-ins, meetings and contract alerts.
- **People** management with search, filters, contract status and a 360° employee profile.
- **Schedules** with attendance KPIs, date/status filters, charts and CSV export.
- **Profiles** with personal data, contracts, documents, birthdays and absence justifications.
- **Reports builder** with 19 widgets, 5 templates, scalable 16:9 preview and pagination.
- **PNG export** at 3840×2160 (4x) and per-table CSV exports.
- **Native PPTX export** with one slide per report page, editable charts (line, bars, doughnut), real tables and visible line markers.
- **Calendar** with monthly view and meeting CRUD for Owner/Management; read-only for HR.
- **Support tickets** with priorities, statuses, responses, activity history and notification count.
- **NFC cards** with assignment, blocking/unblocking, per-card zone permissions and audit history.
- **Global settings** for light/carbon themes, contact data, password change, session logout, company/period and support tickets.
- **Contextual search** for the active module.
- Responsive layout, keyboard focus states and light/dark themes.

## Tech Stack

- HTML5
- CSS3 — Grid, Flexbox and custom properties
- JavaScript ES6 — classic scripts, no build step
- [Chart.js](https://www.chartjs.org/) — vendored locally
- [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) — vendored locally for native PPTX files
- Browser `localStorage` for demo persistence
- GitHub Pages for static hosting

## Project Structure

```text
.
├── index.html              # Login and support modal
├── dashboard.html          # Application shell and hash router
├── areas.html              # NFC access simulator
├── asistencia.html         # NFC attendance simulator
├── css/
│   ├── styles.css
│   ├── variables.css
│   ├── reset.css
│   ├── components.css
│   ├── login.css
│   ├── dashboard.css
│   └── theme-carbon.css
├── js/
│   ├── nfc-reader.js       # Seed data and localStorage data layer
│   ├── session.js          # Session and inactivity handling
│   ├── login.js
│   ├── ui.js
│   ├── theme.js
│   ├── chart-theme.js
│   ├── dashboard.js
│   └── modules/
│       ├── panel.js
│       ├── personal.js
│       ├── horarios.js
│       ├── perfiles.js
│       ├── reportes.js
│       ├── calendario.js
│       ├── tickets.js
│       ├── tarjetas.js
│       └── configuracion.js
├── vendor/
│   ├── chart.umd.min.js
│   └── pptxgen.bundle.js
└── README.md
```

## Run Locally

No dependencies or build step are required.

```bash
cd hr-dashboard
python3 -m http.server 8765
```

Open:

```text
http://localhost:8765
```

## Data and Demo Behavior

- Seed data covers **October 2026**: 50 employees, 8 NFC zones, attendance records, access audits, meetings, tickets, NFC cards and configuration.
- Data is generated in the browser and stored under `localStorage` keys prefixed with `nfc_`.
- Each visitor gets an independent local copy of the demo.
- There is **no backend** and no shared database in this version.
- Web NFC requires a supported Android browser over HTTPS (GitHub Pages satisfies HTTPS); desktop users can use the manual employee picker.
- All demo accounts, emails and credentials are used only for demonstration purposes.

## Deployment

The project is deployed as a static site on **GitHub Pages**. No server-side runtime is required.

To publish a new version, update the files and push to the `main` branch.

## Español

Sistema web estático para gestión de personal, asistencia, accesos NFC, reuniones, tickets y reportes. Incluye exportación a PNG/PPTX con gráficos nativos editables, temas claro/carbón y control de acceso por roles. Demo con datos simulados; cada navegador guarda su propia copia local.

---

Educational portfolio project — Adrian Chavez Huaman.
