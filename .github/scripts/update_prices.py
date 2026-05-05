#!/usr/bin/env python3
"""
update_prices.py
Actualiza el array RAW en public/index.html con nuevos precios de CO1-CO10.

Modos:
  nuevo      → agrega una fila nueva con la fecha indicada
  actualizar → reemplaza la última fila existente con los nuevos precios
"""

import argparse
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path


CONTRACTS = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6", "CO7", "CO8", "CO9", "CO10"]


def parse_args():
    parser = argparse.ArgumentParser(description="Actualizar precios ICE Brent en index.html")
    parser.add_argument("--fecha",  default="",   help="Fecha YYYY-MM-DD (vacío = hoy)")
    parser.add_argument("--co1",    required=True, type=float)
    parser.add_argument("--co2",    required=True, type=float)
    parser.add_argument("--co3",    required=True, type=float)
    parser.add_argument("--co4",    required=True, type=float)
    parser.add_argument("--co5",    required=True, type=float)
    parser.add_argument("--co6",    required=True, type=float)
    parser.add_argument("--co7",    required=True, type=float)
    parser.add_argument("--co8",    required=True, type=float)
    parser.add_argument("--co9",    required=True, type=float)
    parser.add_argument("--co10",   required=True, type=float)
    parser.add_argument("--modo",   default="nuevo", choices=["nuevo", "actualizar"])
    return parser.parse_args()


def get_fecha(raw: str) -> str:
    if raw and raw.strip():
        try:
            datetime.strptime(raw.strip(), "%Y-%m-%d")
            return raw.strip()
        except ValueError:
            print(f"ERROR: Fecha '{raw}' no tiene formato YYYY-MM-DD", file=sys.stderr)
            sys.exit(1)
    return date.today().isoformat()


def load_html(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_raw(content: str):
    match = re.search(r"const RAW=(\[.*?\]);", content, re.DOTALL)
    if not match:
        print("ERROR: No se encontró el array RAW en index.html", file=sys.stderr)
        sys.exit(1)
    return json.loads(match.group(1)), match


def build_row(fecha: str, args) -> dict:
    return {
        "Date": fecha,
        "CO1":  round(args.co1, 2),
        "CO2":  round(args.co2, 2),
        "CO3":  round(args.co3, 2),
        "CO4":  round(args.co4, 2),
        "CO5":  round(args.co5, 2),
        "CO6":  round(args.co6, 2),
        "CO7":  round(args.co7, 2),
        "CO8":  round(args.co8, 2),
        "CO9":  round(args.co9, 2),
        "CO10": round(args.co10, 2),
    }


def update_hardcoded_dates(content: str, fecha: str) -> str:
    """Update any hardcoded date strings in card titles / labels."""
    fecha_display = "/".join(reversed(fecha.split("-")))  # YYYY-MM-DD → DD/MM/YYYY

    # Matrix title e.g. "Spreads al 09/04/2026"
    content = re.sub(
        r'(Spreads al )\d{2}/\d{2}/\d{4}',
        lambda m: m.group(1) + fecha_display,
        content
    )
    # Curve label e.g. ">Hoy — 09/04/2026<"
    content = re.sub(
        r'(>Hoy — )\d{2}/\d{2}/\d{4}(<)',
        lambda m: m.group(1) + fecha_display + m.group(2),
        content
    )
    return content


def main():
    args = parse_args()
    fecha = get_fecha(args.fecha)
    index_path = Path("public/index.html")

    if not index_path.exists():
        print(f"ERROR: No se encontró {index_path}", file=sys.stderr)
        sys.exit(1)

    content = load_html(index_path)
    data, raw_match = extract_raw(content)
    new_row = build_row(fecha, args)

    if args.modo == "nuevo":
        if data and data[-1]["Date"] == fecha:
            print(f"AVISO: Ya existe una fila para {fecha}. Usando modo 'actualizar'.")
            data[-1] = new_row
        else:
            data.append(new_row)
        action = f"Agregada fila nueva para {fecha}"
    else:  # actualizar
        if not data:
            print("ERROR: RAW está vacío, no hay nada que actualizar.", file=sys.stderr)
            sys.exit(1)
        old_date = data[-1]["Date"]
        data[-1] = new_row
        action = f"Actualizada fila {old_date} → {fecha}"

    # Sort by date just in case
    data.sort(key=lambda r: r["Date"])

    # Serialize compactly
    new_raw_json = json.dumps(data, separators=(",", ":"))

    old_raw_str = "const RAW=" + raw_match.group(1) + ";"
    new_raw_str = "const RAW=" + new_raw_json + ";"

    if old_raw_str in content:
        content = content.replace(old_raw_str, new_raw_str)
    else:
        content = re.sub(
            r"const RAW=\[.*?\];",
            "const RAW=" + new_raw_json + ";",
            content,
            flags=re.DOTALL,
        )

    # Update hardcoded date labels
    content = update_hardcoded_dates(content, fecha)

    # Write back
    index_path.write_text(content, encoding="utf-8")

    # Summary
    last = data[-1]
    prev = data[-2] if len(data) >= 2 else None
    print(f"\n✓ {action}")
    print(f"  Fecha : {last['Date']}")
    print(f"  CO1   : {last['CO1']}  CO2 : {last['CO2']}  CO3 : {last['CO3']}")
    print(f"  CO4   : {last['CO4']}  CO5 : {last['CO5']}  CO6 : {last['CO6']}")
    print(f"  CO7   : {last['CO7']}  CO8 : {last['CO8']}  CO9 : {last['CO9']}  CO10: {last['CO10']}")
    if prev:
        print(f"\n  VAR% 1D vs {prev['Date']}:")
        for c in CONTRACTS:
            if c in prev and prev[c]:
                v = (last[c] / prev[c] - 1) * 100
                arrow = "▲" if v > 0 else "▼"
                print(f"    {c:5s}: {arrow} {v:+.2f}%")
    print(f"\n  Total filas RAW: {len(data)}  ({data[0]['Date']} → {data[-1]['Date']})")


if __name__ == "__main__":
    main()
