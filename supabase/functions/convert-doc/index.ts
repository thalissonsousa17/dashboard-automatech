// Supabase Edge Function: convert-doc
// Converte .doc binário OLE para texto usando mammoth (Node.js - suporta formato legado)
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

    // Usa mammoth via npm: (versão Node.js com suporte a OLE binary .doc via cfb)
    // deno-lint-ignore no-explicit-any
    const mammoth = (await import('npm:mammoth')) as any;
    const extractFn = mammoth.default?.extractRawText ?? mammoth.extractRawText;

    // Tenta com arrayBuffer primeiro (browser API), depois com Buffer (Node.js API)
    let result: { value: string };
    try {
      result = await extractFn({ arrayBuffer });
    } catch {
      const { Buffer } = await import('node:buffer');
      const buffer = Buffer.from(arrayBuffer);
      result = await extractFn({ buffer });
    }

    return new Response(JSON.stringify({ text: result.value || '' }), {
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
