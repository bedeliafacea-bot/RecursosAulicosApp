# Carpeta para archivos CSV de Migración

Podés descargar cada hoja de tu Google Spreadsheet actual y guardarla directamente acá como archivo `.csv`.
*(En Google Sheets: **Archivo > Descargar > Valores separados por comas (.csv)**)*

### Nombres sugeridos para los archivos CSV:

| Archivo CSV | Tabla de Destino | Descripción |
| :--- | :--- | :--- |
| `alumnos.csv` | `alumnos` | Legajo, Nombre, Plan (10hs/20hs), Carrera, Teléfono, Dirección, etc. |
| `registros_becuap.csv` | `registros_becuap` | Legajo, Fecha, Entrada 1, Salida 1, Entrada 2, Salida 2, Total Decimal, etc. |
| `horarios_pactados.csv` | `horarios_pactados` | Legajo, Fecha, Rango Horario |
| `cumpleanos.csv` | `cumpleanos` | Nombre, Día, Mes, Teléfono, Tipo |
| `fotocopias.csv` | `registro_fotocopias` | Fecha, Departamento, Cantidad, Tipo, PrecioUnitario, Total, Pagado |
| `cierres_caja.csv` | `cierres_caja` | Fecha, Turno, TotalEfectivo, TotalMP, TotalGalicia, TotalFacturado, etc. |
| `evaluaciones.csv` | `evaluaciones_alumnos` | Legajo, Cuatrimestre, Criterios 1 al 7, Promedio, etc. |

> 💡 **Nota:** El script detecta automáticamente si el archivo está separado por comas (`,`) o por punto y coma (`;`), y no distingue mayúsculas ni minúsculas en los nombres de archivo.

## Propuestas de catálogos para Bedelía Virtual

`propuesta_profesores_universitarios.csv` y `propuesta_materias.csv` son listas preliminares extraídas de las hojas `MATERIAS` de los archivos locales de distribución de aulas del 1.º y 2.º cuatrimestre. No son exportaciones completas del SharePoint ni están listas para importar a Supabase.

Se conservaron los nombres tal como aparecen y no se fusionaron diferencias de escritura que no pudieran confirmarse con seguridad. Los CSV incluyen cuatrimestre y celdas de referencia; `apariciones` cuenta detecciones en las celdas procesadas. `revisar=true` señala variantes, menciones en formatos menos confiables o materias poco frecuentes.

Revisar y aprobar los nombres antes de cargarlos en los catálogos. La migración de esos catálogos no se aplicó como parte de esta extracción.
