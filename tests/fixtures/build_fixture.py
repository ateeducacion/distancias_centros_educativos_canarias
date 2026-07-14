"""Build the shared fictional conformance fixture."""
from pathlib import Path
import json, hashlib
from canarias_route_matrix.binary.writer import write_binary

ROOT=Path(__file__).resolve().parents[2]
CENTERS=[
 {"code":"10000001","name":"Centro Ficticio Norte","island":"GRAN_CANARIA","island_id":3,"municipality":"Municipio Alfa","locality":"Localidad Uno","address":"Calle Uno","postal_code":"00001","longitude":-15.0,"latitude":28.0,"nature":"PUBLIC","center_type":"SCHOOL"},
 {"code":"10000002","name":"Centro Ficticio Sur","island":"GRAN_CANARIA","island_id":3,"municipality":"Municipio Beta","locality":"Localidad Dos","address":"Calle Dos","postal_code":"00002","longitude":-15.1,"latitude":27.9,"nature":"PUBLIC","center_type":"SCHOOL"},
 {"code":"10000009","name":"Centro Ficticio Este","island":"GRAN_CANARIA","island_id":3,"municipality":"Municipio Gamma","locality":"Localidad Tres","address":"Calle Tres","postal_code":"00003","longitude":-15.2,"latitude":27.8,"nature":"PRIVATE","center_type":"SCHOOL"},
 {"code":"20000004","name":"Centro Ficticio Isla Dos","island":"TENERIFE","island_id":7,"municipality":"Municipio Delta","locality":"Localidad Cuatro","address":"Calle Cuatro","postal_code":"00004","longitude":-16.3,"latitude":28.3,"nature":"PUBLIC","center_type":"SCHOOL"},
]
MATRICES={3:([[0,1200,2500],[1100,0,None],[2400,2100,0]],[[0,120,250],[115,0,None],[245,215,0]]),7:([[0]],[[0]])}

def main()->None:
 out=ROOT/"data/samples"; out.mkdir(parents=True,exist_ok=True); binary=out/"sample.bin"
 write_binary(binary,CENTERS,MATRICES)
 centers_text=json.dumps(CENTERS,ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n"; (out/"sample-centers.json").write_text(centers_text,encoding="utf-8")
 digest=hashlib.sha256(binary.read_bytes()).hexdigest()
 manifest={"schema_version":1,"format":{"magic":"CEDIST01","major":1,"minor":0,"endianness":"little"},"data_version":"fixture-1","counts":{"centers":4,"directed_routes":10,"unreachable_routes":1,"islands":{"3":3,"7":1}},"artifacts":{"sample.bin":{"sha256":digest,"size":binary.stat().st_size}}}
 (out/"sample-manifest.json").write_text(json.dumps(manifest,sort_keys=True,indent=2)+"\n",encoding="utf-8")
 (ROOT/"tests/fixtures/sample.bin").write_bytes(binary.read_bytes())

if __name__=="__main__": main()
