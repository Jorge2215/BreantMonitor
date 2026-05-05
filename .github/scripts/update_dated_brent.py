#!/usr/bin/env python3
"""
update_dated_brent.py
Actualiza el array DATED_BRENT en public/index.html con nuevos precios de
Dated Brent (físico, assessment de Platts).

A diferencia de los futures ICE (CO1-CO10), Dated Brent se publica una sola
vez al día (~16:30 Londres) y no cambia durante la sesión. Por eso tiene
su propio workflow separado.

Modos:
  nuevo      → agrega una fila nueva con la fecha indicada
  actualizar → reemplaza la última fila existente con el nuevo precio
"""

import argparse
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Actualizar Dated Brent en index.html")
    parser.add_argument("--fecha", default="",   help="Fecha YYYY-MM-DD (vacío = hoy)")
    parser.add_argument("--db",    required=True, type=float, help="Precio Dated Brent USD/bbl")
    parser.add_argument("--modo",  default="nuevo", choices=["nuevo", "actualizar"])
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


def extract_dated_brent(content: str):
    match = re.search(r"const DATED_BRENT=(\[.*?\]);", content, re.DOTALL)
    if not match:
        print("ERROR: No se encontró el array DATED_BRENT en index.html", file=sys.stderr)
        sys.exit(1)
    return json.loads(match.group(1)), match


def main():
    args = parse_args()
    fecha = get_fecha(args.fecha)
    index_path = Path("public/index.html")

    if not index_path.exists():
        print(f"ERROR: No se encontró {index_path}", file=sys.stderr)
        sys.exit(1)

    content = load_html(index_path)
    data, db_match = extract_dated_brent(content)
    new_row = {"Date": fecha, "DB": round(args.db, 3)}

    if args.modo == "nuevo":
        if data and data[-1]["Date"] == fecha:
            print(f"AVISO: Ya existe una fila para {fecha}. Usando modo 'actualizar'.")
            data[-1] = new_row
        else:
            data.append(new_row)
        action = f"Agregada fila nueva para {fecha}"
    else:  # actualizar
        if not data:
            print("ERROR: DATED_BRENT está vacío, no hay nada que actualizar.", file=sys.stderr)
            sys.exit(1)
        old_date = data[-1]["Date"]
        data[-1] = new_row
        action = f"Actualizada fila {old_date} → {fecha}"

    # Sort by date
    data.sort(key=lambda r: r["Date"])

    # Serialize compactly
    new_db_json = json.dumps(data, separators=(",", ":"))

    old_db_str = "const DATED_BRENT=" + db_match.group(1) + ";"
    new_db_str = "const DATED_BRENT=" + new_db_json + ";"

    if old_db_str in content:
        content = content.replace(old_db_str, new_db_str)
    else:
        content = re.sub(
            r"const DATED_BRENT=\[.*?\];",
            "const DATED_BRENT=" + new_db_json + ";",
            content,
            flags=re.DOTALL,
        )

    # Write back
    index_path.write_text(content, encoding="utf-8")

    # Summary
    last = data[-1]
    prev = data[-2] if len(data) >= 2 else None
    print(f"\n✓ {action}")
    print(f"  Fecha : {last['Date']}")
    print(f"  DB    : ${last['DB']}")
    if prev:
        v = (last["DB"] / prev["DB"] - 1) * 100
        arrow = "▲" if v > 0 else "▼"
        print(f"\n  VAR% 1D vs {prev['Date']}: {arrow} {v:+.2f}%")
        print(f"  Dif   : {last['DB'] - prev['DB']:+.3f} USD/bbl")
    print(f"\n  Total filas DATED_BRENT: {len(data)}  ({data[0]['Date']} → {data[-1]['Date']})")


if __name__ == "__main__":
    main()
