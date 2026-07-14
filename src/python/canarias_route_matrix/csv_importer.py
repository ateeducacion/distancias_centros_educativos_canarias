"""Strict UTF-8 CSV validation and privacy-preserving normalization."""
from __future__ import annotations
from dataclasses import dataclass,asdict
from pathlib import Path
import csv,json,re
from .islands import normalize_island
from .errors import ValidationError

REQUIRED={"Codigo","Denominacion","Direccion","Localidad","Municipio","Isla","Provincia","Naturaleza","TipoCentro","Longitud","Latitud"}
@dataclass(frozen=True)
class ImportResult:
    centers:list[dict[str,object]]; errors:list[dict[str,object]]; warnings:list[dict[str,object]]; included:int; excluded:int; rejected:int
def import_centers(path:Path,code_pattern:str=r"^[0-9]{8}$",include_types:set[str]|None=None,include_natures:set[str]|None=None)->ImportResult:
    raw=path.read_bytes()
    try: text=raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc: raise ValidationError(f"CSV is not valid UTF-8: {exc}") from exc
    sample=text[:8192]
    try: dialect=csv.Sniffer().sniff(sample,delimiters=",;\t|")
    except csv.Error as exc: raise ValidationError("CSV delimiter could not be detected") from exc
    reader=csv.DictReader(text.splitlines(),dialect=dialect)
    headers=set(reader.fieldnames or [])
    if missing:=REQUIRED-headers: raise ValidationError(f"CSV schema changed; missing columns: {sorted(missing)}")
    centers=[];errors=[];warnings=[];seen=set();excluded=0
    for line,row in enumerate(reader,start=2):
        cleaned={key:(value.strip() if value is not None else "") for key,value in row.items()}; code=cleaned["Codigo"]
        row_errors=[]
        if not code: row_errors.append("missing_code")
        elif not re.fullmatch(code_pattern,code): row_errors.append("invalid_code_format")
        elif code in seen: row_errors.append("duplicate_code")
        seen.add(code)
        try: lon=float(cleaned["Longitud"]);lat=float(cleaned["Latitud"])
        except ValueError: lon=lat=0;row_errors.append("invalid_coordinates")
        if not row_errors and (not -180<=lon<=180 or not -90<=lat<=90): row_errors.append("coordinates_out_of_range")
        if not row_errors and not (-19<=lon<=-13 and 27<=lat<=30): row_errors.append("coordinates_outside_canary_bounds")
        try: island_id,island=normalize_island(cleaned["Isla"])
        except ValueError: island_id=0;island="";row_errors.append("unknown_island")
        if row_errors: errors.append({"line":line,"code":code or None,"errors":row_errors});continue
        if (include_types and cleaned["TipoCentro"] not in include_types) or (include_natures and cleaned["Naturaleza"] not in include_natures): excluded+=1;continue
        centers.append({"code":code,"name":cleaned["Denominacion"],"island":island,"island_id":island_id,"municipality":cleaned["Municipio"],"locality":cleaned["Localidad"],"address":cleaned["Direccion"],"postal_code":cleaned.get("CodigoPostal",cleaned.get("CP","")),"longitude":lon,"latitude":lat,"nature":cleaned["Naturaleza"],"center_type":cleaned["TipoCentro"]})
    return ImportResult(centers,errors,warnings,len(centers),excluded,len(errors))
def write_report(result:ImportResult,json_path:Path,markdown_path:Path)->None:
    payload={k:v for k,v in asdict(result).items() if k!="centers"}; json_path.write_text(json.dumps(payload,ensure_ascii=False,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    markdown_path.write_text(f"# Informe de validación\n\n- Incluidos: {result.included}\n- Excluidos: {result.excluded}\n- Rechazados: {result.rejected}\n- Advertencias: {len(result.warnings)}\n\n"+"\n".join(f"- Fila {e['line']}: {', '.join(e['errors'])}" for e in result.errors)+"\n",encoding="utf-8")
