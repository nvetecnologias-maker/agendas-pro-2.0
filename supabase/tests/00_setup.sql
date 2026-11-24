-- Utilitários de teste: asserções e troca de usuário (simula o JWT do Supabase)
create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.ok(cond boolean, msg text) returns text language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FALHOU: %', msg;
  end if;
  return '  ✓ ' || msg;
end $$;

-- Executa um SQL e confirma que ele é REJEITADO (erro ou RLS)
create or replace function tests.throws(sql text, msg text) returns text language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    return '  ✓ ' || msg || '  [' || sqlstate || ']';
  end;
  raise exception 'FALHOU (deveria ter sido rejeitado): %', msg;
end $$;

-- Executa um SQL e devolve quantas linhas ele afetou (UPDATE/DELETE bloqueados por RLS afetam 0)
create or replace function tests.affected(sql text) returns integer language plpgsql as $$
declare n integer;
begin
  execute sql;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on all functions in schema tests to anon, authenticated;

create or replace function tests.login_as(p_email text) returns void language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then raise exception 'usuário % não existe', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, false);
end $$;

create or replace function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
end $$;
