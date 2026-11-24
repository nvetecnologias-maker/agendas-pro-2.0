#!/usr/bin/env python3
"""
Gera src/types/database.generated.ts a partir do banco LOCAL de testes
(o mesmo formato do `supabase gen types typescript`).

Uso (depois de rodar scripts/db-test.sh):
  PGHOST=/tmp PGPORT=54322 PGUSER=postgres python3 scripts/gen-db-types.py

Quando o projeto estiver ligado ao Supabase CLI, dá para trocar por:
  npx supabase gen types typescript --project-id <id> > src/types/database.generated.ts
"""
import json
import os
import subprocess

DB = os.environ.get("TEST_DB", "agendas_pro_test")
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "types", "database.generated.ts")


def q(sql: str):
    out = subprocess.check_output(["psql", "-X", "-q", "-At", "-d", DB, "-c", sql], text=True)
    return json.loads(out.strip() or "null") or []


enums = q("""
select json_agg(json_build_object('name', t.typname, 'values',
  (select json_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)) order by t.typname)
from pg_type t join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typtype = 'e'
""")
enum_names = {e["name"] for e in enums}

columns = q("""
select json_agg(json_build_object(
  'table', c.relname, 'kind', c.relkind, 'col', a.attname,
  'type', format_type(a.atttypid, a.atttypmod), 'base', bt.typname, 'elem', et.typname,
  'notnull', a.attnotnull, 'hasdef', a.atthasdef or a.attidentity <> '', 'generated', a.attgenerated <> '')
  order by c.relname, a.attnum)
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_type bt on bt.oid = a.atttypid
left join pg_type et on et.oid = bt.typelem and bt.typcategory = 'A'
where n.nspname = 'public' and c.relkind in ('r', 'v') and a.attnum > 0 and not a.attisdropped
""")

functions = q("""
select json_agg(json_build_object(
  'name', p.proname,
  'argnames', p.proargnames,
  'argmodes', p.proargmodes,
  'argtypes', (select json_agg(t.typname order by o) from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) with ordinality u(oid, o)
               join pg_type t on t.oid = u.oid),
  'nargs', p.pronargs, 'ndefaults', p.pronargdefaults,
  'rettype', rt.typname, 'retset', p.proretset)
  order by p.proname)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_type rt on rt.oid = p.prorettype
where n.nspname = 'public' and p.prokind = 'f'
  and rt.typname not in ('trigger')
  and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('service_role', p.oid, 'execute'))
""")

fks = q("""
select json_agg(json_build_object(
  'table', c.relname, 'name', con.conname, 'ref', rc.relname,
  'cols', (select json_agg(a.attname order by k.o) from unnest(con.conkey) with ordinality k(n, o)
           join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.n),
  'refcols', (select json_agg(a.attname order by k.o) from unnest(con.confkey) with ordinality k(n, o)
              join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.n),
  'one', exists (select 1 from pg_constraint u where u.conrelid = con.conrelid and u.contype in ('p', 'u')
                 and (select array_agg(x order by x) from unnest(u.conkey) x) = (select array_agg(x order by x) from unnest(con.conkey) x)))
  order by c.relname, con.conname)
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_class rc on rc.oid = con.confrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_namespace rn on rn.oid = rc.relnamespace
where con.contype = 'f' and n.nspname = 'public' and rn.nspname = 'public'
""")
rels: dict[str, list] = {}
for f in fks:
    rels.setdefault(f["table"], []).append(f)

SCALAR = {
    "uuid": "string", "text": "string", "citext": "string", "varchar": "string", "bpchar": "string",
    "date": "string", "time": "string", "timetz": "string", "timestamp": "string", "timestamptz": "string",
    "interval": "string", "tstzrange": "string", "tsrange": "string", "inet": "string",
    "int2": "number", "int4": "number", "int8": "number", "numeric": "number", "float4": "number", "float8": "number",
    "bool": "boolean", "json": "Json", "jsonb": "Json", "void": "undefined", "record": "Json",
}


def ts(base: str, elem: str | None = None) -> str:
    if elem:
        return f"{ts(elem)}[]"
    if base.startswith("_"):
        return f"{ts(base[1:])}[]"
    if base in enum_names:
        return f'Database["public"]["Enums"]["{base}"]'
    return SCALAR.get(base, "unknown")


tables: dict[str, dict] = {}
for c in columns:
    t = tables.setdefault(c["table"], {"kind": c["kind"], "cols": []})
    t["cols"].append(c)

lines = [
    "// ARQUIVO GERADO por scripts/gen-db-types.py — não edite à mão.",
    "",
    "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];",
    "",
    "export type Database = {",
    "  public: {",
    "    Tables: {",
]


def table_block(name: str, info: dict, view: bool):
    out = [f"      {name}: {{", "        Row: {"]
    for c in info["cols"]:
        typ = ts(c["base"], c["elem"])
        null = "" if c["notnull"] and not view else " | null"
        out.append(f"          {c['col']}: {typ}{null};")
    out.append("        };")
    if not view:
        for label in ("Insert", "Update"):
            out.append(f"        {label}: {{")
            for c in info["cols"]:
                if c["generated"]:
                    continue
                typ = ts(c["base"], c["elem"])
                null = "" if c["notnull"] else " | null"
                opt = "?" if (label == "Update" or c["hasdef"] or not c["notnull"]) else ""
                out.append(f"          {c['col']}{opt}: {typ}{null};")
            out.append("        };")
    rl = rels.get(name, []) if not view else []
    if not rl:
        out.append("        Relationships: [];")
    else:
        out.append("        Relationships: [")
        for f in rl:
            out.append("          {")
            out.append(f'            foreignKeyName: "{f["name"]}";')
            out.append(f'            columns: {json.dumps(f["cols"])};')
            out.append(f'            isOneToOne: {"true" if f["one"] else "false"};')
            out.append(f'            referencedRelation: "{f["ref"]}";')
            out.append(f'            referencedColumns: {json.dumps(f["refcols"])};')
            out.append("          },")
        out.append("        ];")
    out.append("      };")
    return out


for name, info in sorted(tables.items()):
    if info["kind"] == "r":
        lines += table_block(name, info, False)
lines += ["    };", "    Views: {"]
for name, info in sorted(tables.items()):
    if info["kind"] == "v":
        lines += table_block(name, info, True)
lines += ["    };", "    Functions: {"]

seen = set()
for f in functions:
    if f["name"] in seen:
        continue
    seen.add(f["name"])
    names = f["argnames"] or []
    modes = f["argmodes"] or ["i"] * len(f["argtypes"] or [])
    types = f["argtypes"] or []
    ins, outs = [], []
    for i, typ in enumerate(types):
        mode = modes[i] if i < len(modes) else "i"
        nm = names[i] if i < len(names) else f"arg{i}"
        (ins if mode in ("i", "b") else outs).append((nm, typ))
    first_default = len(ins) - (f["ndefaults"] or 0)
    args = "; ".join(f"{n}{'?' if i >= first_default else ''}: {ts(t)}" for i, (n, t) in enumerate(ins))
    args = f"{{ {args} }}" if args else "Record<PropertyKey, never>"
    if outs:
        ret = "{ " + "; ".join(f"{n}: {ts(t)}" for n, t in outs) + " }"
        ret = f"{ret}[]" if f["retset"] else ret
    elif f["rettype"] == "tstzrange" and f["retset"]:
        ret = "string[]"
    else:
        ret = ts(f["rettype"]) + ("[]" if f["retset"] else "")
    lines.append(f"      {f['name']}: {{ Args: {args}; Returns: {ret} }};")

lines += ["    };", "    Enums: {"]
for e in enums:
    vals = " | ".join(f'"{v}"' for v in e["values"])
    lines.append(f"      {e['name']}: {vals};")
lines += ["    };", "    CompositeTypes: { [_ in never]: never };", "  };", "};", ""]

with open(OUT, "w") as fh:
    fh.write("\n".join(lines))
print(f"ok: {len(tables)} tabelas/views, {len(seen)} funções, {len(enums)} enums -> {os.path.relpath(OUT)}")
