"use client";

import type React from "react";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, BarChart3, Loader2 } from "lucide-react";
import { DynamicChart } from "@/components/dynamic-chart";

interface ChartInsight {
  type: "bar_chart" | "pie_chart" | "line_chart";
  summary: string;
  data: Array<Record<string, string | number>>;
  chart_representation: {
    x_axis?: string;
    y_axis?: string;
    dataKey?: string;
    nameKey?: string;
  };
}

interface AnalysisResult {
  success: boolean;
  fileName: string;
  summary?: string;
  insights: ChartInsight[];
}

export default function CSVDashboard() {
  const printRef = useRef<HTMLDivElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [insightQuery, setInsightQuery] = useState<string>("");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        setSelectedFile(file);
        setError(null);
        setAnalysisResult(null);
      } else {
        setError("Selecione um arquivo CSV válido");
        setSelectedFile(null);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        setSelectedFile(file);
        setError(null);
        setAnalysisResult(null);
      } else {
        setError("Selecione um arquivo CSV válido");
        setSelectedFile(null);
      }
    }
  };

  const analyzeCSV = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("csvFile", selectedFile);
      if (insightQuery.trim()) {
        formData.append("insightQuery", insightQuery.trim());
      }

      const response = await fetch("/api/csvs/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result);
      } else {
        setError(result.error || "Falha ao analisar o CSV");
      }
    } catch (err) {
      setError("Falha ao analisar o arquivo CSV");
      console.error("[v0] Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-balance">CSV Inteligente</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Envie seu arquivo CSV e obtenha insights com IA em gráficos
            interativos
          </p>
        </div>

        {/* Upload Section */}
        <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Enviar arquivo CSV
            </CardTitle>
            <CardDescription>
              Arraste e solte seu arquivo CSV aqui ou clique para selecionar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="relative cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-primary/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("csv-upload")?.click()}
            >
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                </div>

                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">
                      Arraste e solte seu arquivo CSV aqui ou clique para
                      selecionar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Somente arquivos CSV são suportados
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Optional user guidance for insights */}
            <div className="mt-6 space-y-2">
              <label
                htmlFor="insight-topics"
                className="block text-sm font-medium"
              >
                Foque nos seguintes temas (opcional)
              </label>
              <input
                id="insight-topics"
                type="text"
                value={insightQuery}
                onChange={(e) => setInsightQuery(e.target.value)}
                placeholder="ex.: quantidade de vendas, valor das vendas, ticket médio"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Vamos priorizar insights relacionados a esses termos quando
                possível, sem inventar números.
              </p>
            </div>

            <div className="mt-6">
              <Button
                onClick={analyzeCSV}
                disabled={!selectedFile || isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando CSV...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analisar CSV
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {analysisResult && (
          <div ref={printRef} className="space-y-6 print-area">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-balance">
                Resultados da Análise
              </h2>
              <p className="text-muted-foreground">
                Insights gerados por IA a partir de {analysisResult.fileName}
              </p>
            </div>

            {/* Actions (not printed) */}
            <div className="flex justify-end no-print">
              <Button variant="default" onClick={() => window.print()}>
                Exportar PDF
              </Button>
            </div>

            {analysisResult.summary && (
              <Card className="bg-muted/30 border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo dos insights</CardTitle>
                  <CardDescription className="text-pretty">
                    {analysisResult.summary}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {analysisResult.insights.map((insight, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg text-balance">
                      {insight.summary}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <DynamicChart insight={insight} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
