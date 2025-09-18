import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { parse } from "csv-parse/sync";

// ...existing code...
const csvInsightSchema = z.object({
  // Resumo textual geral em PT-BR dos principais insights do CSV
  summary: z
    .string()
    .describe(
      "Resumo em português do Brasil explicando os principais achados e padrões dos dados analisados"
    ),
  insights: z.array(
    z.object({
      type: z.enum(["bar_chart", "pie_chart", "line_chart"]),
      summary: z.string().describe("Brief summary of what this chart shows"),
      data: z.array(
        z.object({
          name: z.string().optional(),
          category: z.string().optional(),
          value: z.number(),
          label: z.string().optional(),
        })
      ),
      chart_representation: z.object({
        x_axis: z.string().optional(),
        y_axis: z.string().optional(),
        dataKey: z.string().optional(),
        nameKey: z.string().optional(),
      }),
    })
  ),
});

// Helpers de inferência/estatística para reduzir alucinação
function detectDelimiter(text: string) {
  const semicolons = (text.match(/;/g) || []).length;
  const commas = (text.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseNumberBR(value: string) {
  if (value == null) return NaN;
  const v = value.trim();
  if (v === "") return NaN;
  // Tenta formato pt-BR: 1.234,56
  const br = v.replace(/\./g, "").replace(",", ".");
  const n1 = Number(br);
  if (!Number.isNaN(n1)) return n1;
  // Tenta padrão internacional
  const n2 = Number(v);
  return Number.isNaN(n2) ? NaN : n2;
}

function isLikelyDate(value: string) {
  const v = value?.trim();
  if (!v) return false;
  // dd/mm/yyyy ou yyyy-mm-dd
  return (
    /^\d{2}\/\d{2}\/\d{4}$/.test(v) ||
    /^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isNaN(Date.parse(v))
  );
}

function toDate(value: string): Date | null {
  if (!value) return null;
  const v = value.trim();
  // tenta dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split("/").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(v);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

type Aggregates = {
  headers: string[];
  rowCount: number;
  samples: any[];
  columns: Record<
    string,
    | {
        inferredType: "number";
        stats: {
          count: number;
          sum: number;
          mean: number;
          min: number;
          max: number;
        };
      }
    | {
        inferredType: "category";
        stats: {
          distinctCount: number;
          topValues: Array<{ value: string; count: number }>;
        };
      }
    | {
        inferredType: "date";
        stats: {
          byMonth: Array<{ month: string; count: number }>;
          minDate?: string;
          maxDate?: string;
        };
      }
  >;
};

function summarizeCSV(csvText: string): Aggregates {
  const delimiter = detectDelimiter(csvText);
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    delimiter,
    trim: true,
  }) as Record<string, string>[];

  const headers = records.length ? Object.keys(records[0]) : [];
  const rowCount = records.length;
  const samples = records;

  const columns: Aggregates["columns"] = {};

  for (const col of headers) {
    const values = records.map((r) => r[col]).filter((v) => v !== undefined);

    // Heurísticas: detecta numérico e data
    let numericCount = 0;
    let dateCount = 0;
    for (const v of values) {
      if (!Number.isNaN(parseNumberBR(v))) numericCount++;
      if (isLikelyDate(v)) dateCount++;
    }

    // threshold simples
    if (numericCount >= Math.max(3, values.length * 0.6)) {
      // número
      let count = 0;
      let sum = 0;
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

      for (const v of values) {
        const n = parseNumberBR(v);
        if (!Number.isNaN(n)) {
          count++;
          sum += n;
          if (n < min) min = n;
          if (n > max) max = n;
        }
      }
      const mean = count > 0 ? sum / count : 0;
      columns[col] = {
        inferredType: "number",
        stats: {
          count,
          sum: Number.isFinite(sum) ? Number(sum) : 0,
          mean: Number.isFinite(mean) ? Number(mean) : 0,
          min: Number.isFinite(min) ? Number(min) : 0,
          max: Number.isFinite(max) ? Number(max) : 0,
        },
      };
      continue;
    }

    if (dateCount >= Math.max(3, values.length * 0.5)) {
      // data -> agrega por mês
      const byMonthMap = new Map<string, number>();
      let minDate: Date | null = null;
      let maxDate: Date | null = null;
      for (const v of values) {
        const d = toDate(v);
        if (!d) continue;
        const key = monthKey(d);
        byMonthMap.set(key, (byMonthMap.get(key) || 0) + 1);
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
      const byMonth = Array.from(byMonthMap, ([month, count]) => ({
        month,
        count,
      })).sort((a, b) => a.month.localeCompare(b.month));
      columns[col] = {
        inferredType: "date",
        stats: {
          byMonth,
          minDate: minDate ? minDate.toISOString().slice(0, 10) : undefined,
          maxDate: maxDate ? maxDate.toISOString().slice(0, 10) : undefined,
        },
      };
      continue;
    }

    // categoria
    const freq = new Map<string, number>();
    for (const v of values) {
      const key = (v ?? "").toString().trim() || "(vazio)";
      freq.set(key, (freq.get(key) || 0) + 1);
    }
    const topValues = Array.from(freq, ([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    columns[col] = {
      inferredType: "category",
      stats: {
        distinctCount: freq.size,
        topValues,
      },
    };
  }

  return {
    headers,
    rowCount,
    samples,
    columns,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const csvFile = formData.get("csvFile") as File;
    const insightQuery =
      (formData.get("insightQuery") as string | null)?.trim() || "";

    if (!csvFile) {
      return Response.json({ error: "No CSV file provided" }, { status: 400 });
    }

    // Validate file type
    if (!csvFile.name.endsWith(".csv") && csvFile.type !== "text/csv") {
      return Response.json({ error: "File must be a CSV" }, { status: 400 });
    }

    // Read CSV content
    const csvContent = await csvFile.text();

    // ...existing code...
    // Antes: enviava CSV inteiro -> agora: agrega e envia só estatísticas
    const aggregates = summarizeCSV(csvContent);
    const aggregatesJson = JSON.stringify(aggregates);

    console.log("[v0] Processing CSV file:", csvFile.name);
    console.log("[v0] Aggregates:", aggregates);

    // Generate AI insights usando apenas os agregados
    const { object } = await generateObject({
      // Opcional: troque para um modelo "pro" se disponível para mais exatidão
      model: google("gemini-2.5-flash"),
      schema: csvInsightSchema,
      temperature: 0.2,
      prompt: `Você é um analista de dados. Baseie-se EXCLUSIVAMENTE no JSON de estatísticas abaixo, calculado a partir do CSV.

JSON_DE_ESTATISTICAS (ground truth):
${aggregatesJson}

Se o usuário forneceu temas de interesse, priorize insights relacionados a eles quando possível, SEM extrapolar além do JSON. Temas (opcional): ${
        insightQuery || "(nenhum)"
      }

Tarefa:
1) Escreva um resumo em PT-BR (4–6 frases) com 5–6 insights, tendências e recomendações, SEM inventar números.
2) Gere uma lista de insights com sugestões de visualizações (bar_chart, pie_chart ou line_chart), cada um com:
   - summary: breve
   - data: pontos derivados APENAS do JSON_DE_ESTATISTICAS (nunca invente valores)
   - chart_representation conforme o tipo (veja regras abaixo)

Regras obrigatórias:
- Não invente números nem categorias. Use somente o que estiver em JSON_DE_ESTATISTICAS.
- Se um valor ou relação não estiver disponível no JSON, diga "não disponível" ou foque em outro aspecto.
 - Se os temas do usuário não forem compatíveis com o que há no JSON, explique brevemente essa limitação e ofereça um insight alternativo disponível.
- Para bar_chart: use eixos coerentes (x_axis: categoria; y_axis: valor).
- Para pie_chart: use nameKey (rótulo/categoria) e dataKey (valor).
- Para line_chart temporal: use algum campo de data agregado por mês (x_axis: mês; y_axis: contagem ou outra métrica disponível).
- Prefira:
  * Frequências de categorias (topValues) para barras/pizza.
  * Séries mensais (byMonth) para linhas.
  * Para números: use min, max, mean, sum (quando fizer sentido), SEM criar métricas inexistentes.
- Não repita o mesmo insight; traga variedade útil.
- Use nomes de eixos/chaves que existam no JSON (ex.: "month", "count", "value", "category", "name").

Formas de produzir os dados dos gráficos (exemplos):
- De categorias:
  data = topValues.map(({ value, count }) => ({ category: value, value: count }))
  chart_representation = { x_axis: "category", y_axis: "value" }
- De série temporal:
  data = byMonth.map(({ month, count }) => ({ label: month, value: count }))
  chart_representation = { x_axis: "label", y_axis: "value" }
- De números (comparações simples entre colunas numéricas não são permitidas se não houver agregação explícita no JSON).

Importante: mantenha-se estritamente dentro do JSON_DE_ESTATISTICAS.`,
    });

    console.log("[v0] Generated insights:", JSON.stringify(object, null, 2));

    return Response.json({
      success: true,
      fileName: csvFile.name,
      summary: object.summary,
      insights: object.insights,
      // Opcional: retornar agregados para debug no frontend
      aggregates,
    });
  } catch (error) {
    console.error("[v0] Error processing CSV:", error);
    return Response.json(
      { error: "Failed to process CSV file" },
      { status: 500 }
    );
  }
}
