import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT = `Você é um especialista em análise de comprovantes fiscais brasileiros para reembolso corporativo.

ANALISE CUIDADOSAMENTE a imagem e extraia as informações. Seja RIGOROSO e CONSERVADOR na classificação.

## REGRAS DE CATEGORIA (leia com atenção):

### RESTAURANT (Alimentação):
- Notas fiscais de restaurantes, lanchonetes, padarias, cafeterias
- Delivery de COMIDA: iFood, Rappi, Uber Eats, 99Food, Zé Delivery
- Supermercados quando claramente para alimentação
- CNAE ou descrição menciona "alimentação", "refeição", "restaurante", "lanchonete"
- ⚠️ iFood pode ser comida OU farmácia - LEIA os itens!

### TRANSPORT (Transporte):
- APENAS corridas de app: Uber, 99, Cabify, InDriver (recibo de corrida)
- Táxi convencional
- Combustível (posto de gasolina)
- Estacionamento
- ⚠️ NÃO classifique delivery de comida como transporte!
- ⚠️ Uber Eats é ALIMENTAÇÃO, não transporte!

### HOTEL (Hospedagem):
- Hotéis, pousadas, hostels, Airbnb
- Apenas se for pernoite/estadia

### FLIGHT (Passagem Aérea):
- Passagens aéreas (LATAM, GOL, Azul, etc.)
- Taxas de embarque
- Apenas transporte AÉREO

### OTHER (Outros):
- Quando não conseguir identificar com certeza
- Farmácias, lojas, serviços diversos

## REGRAS DE CONFIANÇA (seja honesto):
- 90-100%: Texto perfeitamente legível, categoria óbvia, todos os dados claros
- 70-89%: Texto legível, categoria provável, alguns dados podem estar incertos
- 50-69%: Texto parcialmente legível, categoria deduzida, dados incertos
- 30-49%: Texto difícil de ler, categoria é um palpite
- 0-29%: Quase impossível identificar, use "other"

## DICAS DE IDENTIFICAÇÃO:
- iFood com itens como "Hambúrguer", "Pizza", "Açaí" = RESTAURANT
- iFood com itens como "Dipirona", "Band-aid" = OTHER (farmácia)
- Recibo Uber/99 com "Origem → Destino" e km = TRANSPORT
- Recibo Uber Eats com lista de comidas = RESTAURANT

Responda APENAS com JSON válido, sem markdown, sem explicações:
{"category":"restaurant"|"transport"|"hotel"|"flight"|"other","establishment":"nome do estabelecimento","date":"DD/MM/YYYY","value":123.45,"description":"breve descrição","confidence":75}

Se não conseguir ler algum campo, use null para value e "Não identificado" para establishment.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { base64, filename } = body;
    
    if (!base64) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }

    // Verificar se a API key existe
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    // Verificar se a resposta tem conteúdo
    if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
      console.error('Resposta inválida da API:', response);
      return NextResponse.json({ error: 'Resposta inválida da API' }, { status: 500 });
    }

    const firstContent = response.content[0];
    const text = firstContent && firstContent.type === 'text' ? firstContent.text : '';
    
    if (!text) {
      console.error('Texto vazio na resposta:', response.content);
      return NextResponse.json({ error: 'Resposta vazia da API' }, { status: 500 });
    }
    
    // Extrair JSON da resposta
    let parsed: Record<string, unknown> = {};
    
    // Limpar markdown se houver
    let clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    
    // Tentar parsear
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Tentar extrair JSON do meio do texto
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('Falha ao parsear JSON:', clean);
        }
      }
    }

    // Validar e ajustar confiança
    let confidence = parsed.confidence != null ? Number(parsed.confidence) : 50;
    
    // Se confiança veio como decimal (0.95), converter para porcentagem
    if (confidence > 0 && confidence <= 1) {
      confidence = Math.round(confidence * 100);
    }
    
    // Garantir que está no range válido
    confidence = Math.max(0, Math.min(100, confidence));

    return NextResponse.json({
      category: parsed.category ?? 'other',
      establishment: parsed.establishment ?? 'Não identificado',
      date: parsed.date ?? '—',
      value: parsed.value != null ? parseFloat(String(parsed.value)) : null,
      description: parsed.description ?? filename ?? '',
      confidence,
    });
  } catch (error: any) {
    console.error('Erro na análise:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao analisar comprovante' },
      { status: 500 }
    );
  }
}
