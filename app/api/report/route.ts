import { NextResponse } from "next/server";
import { AnalysisResult, buildRuleBasedReport } from "@/lib/analyze";

function buildEnglishReport(analysis: AnalysisResult) {
  const topValue = analysis.valueChart?.rows[0];
  const topCategory = analysis.categoryChart?.rows[0];
  const significantTests = analysis.statisticalTests.filter((test) => test.pValue !== null && test.pValue < 0.05);

  return {
    source: "rule-based",
    title: "AI Data Analysis Report",
    summary: `This dataset contains ${analysis.rowCount} rows and ${analysis.columnCount} columns. The quality score is ${analysis.qualityScore}/100.`,
    findings: [
      `Missing rate is ${(analysis.missingRate * 100).toFixed(2)}%, with ${analysis.duplicateRows} duplicate rows detected.`,
      topCategory
        ? `${analysis.categoryChart?.field}: ${topCategory.name} has the highest record count (${topCategory.value}).`
        : "No suitable categorical field was identified for category comparison.",
      topValue
        ? `${analysis.valueChart?.field}: ${topValue.name} has the highest aggregated value (${topValue.value}).`
        : "No suitable numeric aggregation field was identified.",
      significantTests.length
        ? `${significantTests.length} statistical test(s) are significant at the 5% level.`
        : "No strong difference was found at the 5% significance level."
    ],
    actions: [
      "Review missing values and duplicates before formal analysis.",
      "Compare high-performing and low-performing segments to build business hypotheses.",
      "Use statistical test results as exploratory evidence, not causal proof.",
      "Enable DeepSeek locally if you need a more natural business narrative."
    ]
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as { analysis: AnalysisResult; useAI?: boolean; language?: "zh" | "en" };
  const fallback = body.language === "en" ? buildEnglishReport(body.analysis) : buildRuleBasedReport(body.analysis);
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey || !body.useAI) {
    return NextResponse.json(fallback);
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        thinking: { type: "disabled" },
        messages: [
          {
            role: "system",
            content:
              "你是面向运营和商业分析岗位的数据分析师。只基于用户提供的统计结果写结论，不编造不存在的数据。输出 JSON。"
          },
          {
            role: "user",
            content: `请根据以下数据分析结果生成${body.language === "en" ? "英文" : "中文"}业务分析报告，JSON 字段为 title, summary, findings, actions。数据：${JSON.stringify(
              body.analysis
            )}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        ...fallback,
        source: "rule-based",
        aiError: `DeepSeek request failed: ${response.status} ${errorText.slice(0, 240)}`
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : fallback;

    return NextResponse.json({ source: "deepseek", ...parsed });
  } catch (error) {
    return NextResponse.json({
      ...fallback,
      source: "rule-based",
      aiError: error instanceof Error ? error.message : "Unknown DeepSeek error"
    });
  }
}
