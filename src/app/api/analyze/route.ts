import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = `Você é especialista em análise de comprovantes fiscais e recibos de despesas corporativas brasileiros.
Analise a imagem (NFC-e, recibo Uber/99, hotel, passagem aérea, etc.).
- Uber/99/táxi: establishment="Uber","99" ou "Táxi"; value=Total cobrado (não preço base)
- Restaurante: establishment=nome no cabeçalho da NF
- Hotel: nome do hotel; Passagem: companhia aérea ou agência
- value=total final pago em reais; se múltiplos docs na imagem, foque no central
Responda APENAS JSON válido sem markdown:
{"category":"restaurant"|"transport"|"hotel"|"flight"|"other","establishment":"string","date":"DD/MM/AAAA","value":0.00,"description":"string","confidence":0}`;

export async function POST(req: Request) {
  try {
    const { base64, filename } = await req.json();
    if (!base64) {
      return NextResponse.json({ error: 'Imagem ausente' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64,
        },
      },
      PROMPT,
    ]);

    const response = await result.response;
    const txt = response.text() ?? '{}';
    
    let clean = txt.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    let parsed: Record<string, unknown> = {};
    
    try {
      parsed = JSON.parse(clean);
    } catch {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {}
      }
    }

    return NextResponse.json({
      category: parsed.category ?? 'other',
      establishment: parsed.establishment ?? 'Não identificado',
      date: parsed.date ?? '—',
      value: parsed.value != null ? parseFloat(String(parsed.value)) : null,
      description: parsed.description ?? filename ?? '',
      confidence: parsed.confidence ?? 50,
    });
  } catch (err) {
    console.error('[analyze]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
