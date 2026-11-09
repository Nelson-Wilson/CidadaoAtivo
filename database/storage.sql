-- Cria o bucket público das fotografias no Supabase Storage.
-- Corre no SQL Editor do Supabase (ou cria o bucket "ocorrencias" como PUBLIC em Storage > New bucket).
-- As escritas fazem-se só pelo servidor (service role); o público só pode LER os ficheiros.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ocorrencias', 'ocorrencias', true, 4194304, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
