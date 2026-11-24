-- ============================================================================
-- 0007 · Supabase Storage: imagens da barbearia
-- Caminho dos arquivos: <barbershop_id>/<pasta>/<arquivo>
-- A primeira pasta do caminho é o tenant, e é ela que a política verifica.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barbershop-media', 'barbershop-media', true, 5242880,  -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- Leitura pública (logo, capa e fotos aparecem na página de agendamento)
create policy barbershop_media_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'barbershop-media');

-- Upload/alteração/remoção: apenas gestores da barbearia dona da pasta
create policy barbershop_media_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'barbershop-media'
    and public.is_shop_manager(((storage.foldername(name))[1])::uuid)
  );
create policy barbershop_media_update on storage.objects for update to authenticated
  using (
    bucket_id = 'barbershop-media'
    and public.is_shop_manager(((storage.foldername(name))[1])::uuid)
  );
create policy barbershop_media_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'barbershop-media'
    and public.is_shop_manager(((storage.foldername(name))[1])::uuid)
  );
