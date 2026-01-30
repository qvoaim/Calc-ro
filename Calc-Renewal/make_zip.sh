#!/usr/bin/env bash
# Ejecutar en la carpeta donde esté la carpeta 'skilltrees'
# Creará skilltrees_all_examples.zip con todos los JSON dentro de skilltrees/
set -e
OUT="skilltrees_all_examples.zip"
if [ ! -d "skilltrees" ]; then
  echo "No se encontró la carpeta 'skilltrees' en este directorio."
  exit 1
fi
rm -f "$OUT"
zip -r "$OUT" skilltrees -q
echo "Creado $OUT"