// Supabase Edge Function: convert-doc
// Converte .doc binário OLE para texto usando word-extractor (suporte nativo a OLE/cfb)
// Deploy: npx supabase@latest functions deploy convert-doc --no-verify-jwt

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Arquivo não enviado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const { Buffer } = await import('node:buffer');
    const buffer = Buffer.from(arrayBuffer);

    let text = '';

    // Tenta mammoth primeiro (funciona para .docx e alguns .doc modernos)
    try {
      // deno-lint-ignore no-explicit-any
      const mammoth = (await import('npm:mammoth')) as any;
      const extractFn = mammoth.default?.extractRawText ?? mammoth.extractRawText;
      const result = await extractFn({ buffer });
      text = result.value || '';
    } catch {
      // mammoth falhou (OLE binário) — tenta word-extractor
      try {
        // deno-lint-ignore no-explicit-any
        const mod = (await import('npm:word-extractor')) as any;
        const WordExtractor = mod.default ?? mod;
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(buffer);
        text = extracted.getBody() || '';
      } catch (innerErr) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        return new Response(JSON.stringify({ error: `word-extractor: ${msg}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
