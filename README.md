# ICE Brent — Spread Monitor

Dashboard interactivo para el análisis de spreads de futuros de petróleo ICE Brent (CO1–CO7).

## 📊 Features

- **Spread Histórico**: Gráfico de línea con selector de par de contratos (CO1–CO7), modo % o USD, y filtro de fecha flexible (pills 1M / 3M / 6M / MAX + inputs manuales).
- **Matriz de Spreads Clickeable**: Tabla de todos los pares al último precio disponible. Click en cualquier celda para cargar ese par en el gráfico histórico.
- **Curvas Forward**: Tres curvas simultáneas — la curva actual siempre visible + dos configurables (1 mes, 2 meses, 3 meses, 6 meses, 1 año atrás).
- **Precios y Estructura**: Tabla de precios del último día y clasificación Backwardation / Contango / Flat por par consecutivo.

## 🗂 Estructura

```
brent-spread-monitor/
├── public/
│   └── index.html      # App completa (HTML + CSS + JS embebidos)
├── vercel.json         # Configuración de deploy para Vercel
└── README.md
```

## 🚀 Deploy en Vercel

1. Subí este repo a GitHub.
2. Entrá a [vercel.com](https://vercel.com) → **Add New Project** → importá el repo.
3. Vercel detecta `vercel.json` automáticamente — no hace falta configurar nada.
4. Click en **Deploy**. En menos de 30 segundos tenés la URL pública.

## 🛠 Stack

- HTML / CSS / Vanilla JS — sin frameworks ni build steps.
- [Chart.js 4.4.1](https://www.chartjs.org/) — cargado desde CDN.
- [IBM Plex Mono / IBM Plex Sans](https://fonts.google.com/) — cargado desde Google Fonts.

## 📈 Datos

Contratos ICE Brent CO1–CO7 — histórico diario desde enero 2025 al 06/04/2026.

---

*Built for oil & gas financial analysis.*
