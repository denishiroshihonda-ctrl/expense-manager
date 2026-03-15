import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    });

    const txt = message.content.find((b) => b.type === 'text')?.text ?? '{}';
    let clean = txt.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    let result: Record<string, unknown> = {};
    
    try { 
      result = JSON.parse(clean); 
    } catch { 
      const m = clean.match(/\{[\s\S]*\}/); 
      if (m) { 
        try { result = JSON.parse(m[0]); } catch {} 
      } 
    }

    return NextResponse.json({
      category: result.category ?? 'other',
      establishment: result.establishment ?? 'Não identificado',
      date: result.date ?? '—',
      value: result.value != null ? parseFloat(String(result.value)) : null,
      description: result.description ?? filename ?? '',
      confidence: result.confidence != null 
  ? (result.confidence <= 1 ? Math.round(result.confidence * 100) : result.confidence) 
  : 50,
    });
  } catch (err) {
    console.error('[analyze]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
