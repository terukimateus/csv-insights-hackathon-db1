import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"

const csvInsightSchema = z.object({
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
        }),
      ),
      chart_representation: z.object({
        x_axis: z.string().optional(),
        y_axis: z.string().optional(),
        dataKey: z.string().optional(),
        nameKey: z.string().optional(),
      }),
    }),
  ),
})

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const csvFile = formData.get("csvFile") as File

    if (!csvFile) {
      return Response.json({ error: "No CSV file provided" }, { status: 400 })
    }

    // Validate file type
    if (!csvFile.name.endsWith(".csv") && csvFile.type !== "text/csv") {
      return Response.json({ error: "File must be a CSV" }, { status: 400 })
    }

    // Read CSV content
    const csvContent = await csvFile.text()

    // Parse CSV headers and sample data for analysis
    const lines = csvContent.split("\n").filter((line) => line.trim())
    const headers = lines[0]
    const sampleData = lines.slice(0, 6).join("\n") // First 5 rows + header

    console.log("[v0] Processing CSV file:", csvFile.name)
    console.log("[v0] CSV headers:", headers)

    // Generate AI insights using Gemini
    const { object } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: csvInsightSchema,
      prompt: `Analyze this CSV data and create 2-3 different chart insights. 
      
CSV Data:
${sampleData}

Create insights that show meaningful patterns in the data. For each insight:
1. Choose the most appropriate chart type (bar_chart, pie_chart, or line_chart)
2. Provide a clear summary of what the chart shows
3. Structure the data with these fields:
   - name: string (optional, for categories/labels)
   - category: string (optional, for grouping)
   - value: number (required, the numeric value)
   - label: string (optional, for display labels)
4. Set correct chart_representation keys based on chart type:
   - For bar_chart: use x_axis and y_axis
   - For pie_chart: use dataKey and nameKey
   - For line_chart: use x_axis and y_axis

Make sure the data values are realistic and the insights are meaningful.`,
    })

    console.log("[v0] Generated insights:", JSON.stringify(object, null, 2))

    // In a real app, you would save to database here
    // For now, we'll just return the analysis
    return Response.json({
      success: true,
      fileName: csvFile.name,
      insights: object.insights,
    })
  } catch (error) {
    console.error("[v0] Error processing CSV:", error)
    return Response.json({ error: "Failed to process CSV file" }, { status: 500 })
  }
}
