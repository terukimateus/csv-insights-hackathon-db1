"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, BarChart3, Loader2 } from "lucide-react"
import { DynamicChart } from "@/components/dynamic-chart"

interface ChartInsight {
  type: "bar_chart" | "pie_chart" | "line_chart"
  summary: string
  data: Array<Record<string, string | number>>
  chart_representation: {
    x_axis?: string
    y_axis?: string
    dataKey?: string
    nameKey?: string
  }
}

interface AnalysisResult {
  success: boolean
  fileName: string
  insights: ChartInsight[]
}

export default function CSVDashboard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        setSelectedFile(file)
        setError(null)
        setAnalysisResult(null)
      } else {
        setError("Please select a valid CSV file")
        setSelectedFile(null)
      }
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        setSelectedFile(file)
        setError(null)
        setAnalysisResult(null)
      } else {
        setError("Please select a valid CSV file")
        setSelectedFile(null)
      }
    }
  }

  const analyzeCSV = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("csvFile", selectedFile)

      const response = await fetch("/api/csvs/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setAnalysisResult(result)
      } else {
        setError(result.error || "Failed to analyze CSV")
      }
    } catch (err) {
      setError("Failed to analyze CSV file")
      console.error("[v0] Analysis error:", err)
    } finally {
      setIsAnalyzing(false)
    }
  }

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
            Upload your CSV file and get AI-powered insights with interactive charts
          </p>
        </div>

        {/* Upload Section */}
        <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <CardDescription>Drag & drop your CSV file here, or click to select</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="relative cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-primary/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("csv-upload")?.click()}
            >
              <input id="csv-upload" type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />

              <div className="space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                </div>

                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Drag & drop your CSV file here, or click to select</p>
                    <p className="text-sm text-muted-foreground">Only CSV files are supported</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="mt-6">
              <Button onClick={analyzeCSV} disabled={!selectedFile || isAnalyzing} className="w-full" size="lg">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing CSV...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analyze CSV
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {analysisResult && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-balance">Analysis Results</h2>
              <p className="text-muted-foreground">AI-generated insights from {analysisResult.fileName}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {analysisResult.insights.map((insight, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg text-balance">
                      {insight.type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </CardTitle>
                    <CardDescription className="text-pretty">{insight.summary}</CardDescription>
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
    </div>
  )
}
