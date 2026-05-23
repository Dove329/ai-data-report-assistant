"use client";

import Papa from "papaparse";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useMemo, useState } from "react";
import { AnalysisResult, DataRow, analyzeRows, buildRuleBasedReport } from "@/lib/analyze";

type Report = ReturnType<typeof buildRuleBasedReport> & { source?: string; aiError?: string };
type Language = "zh" | "en";

const sampleScenarios = [
  {
    label: "电商销售",
    enLabel: "E-commerce Sales",
    description: "GMV、品类、城市、渠道",
    enDescription: "GMV, category, city, channel",
    path: "/sample-ecommerce.csv",
    fileName: "sample-ecommerce.csv"
  },
  {
    label: "A/B 实验",
    enLabel: "A/B Test",
    description: "曝光、点击、转化、客单价",
    enDescription: "Exposure, clicks, conversion, order value",
    path: "/sample-ab-test.csv",
    fileName: "sample-ab-test.csv"
  },
  {
    label: "渠道投放",
    enLabel: "Campaigns",
    description: "花费、线索、转化、ROI",
    enDescription: "Cost, leads, conversion, ROI",
    path: "/sample-marketing.csv",
    fileName: "sample-marketing.csv"
  },
  {
    label: "用户留存",
    enLabel: "Retention",
    description: "分群、活跃、留存、复购",
    enDescription: "Segments, activity, retention, repeat purchase",
    path: "/sample-retention.csv",
    fileName: "sample-retention.csv"
  }
];

const uiText = {
  zh: {
    subtitle: "CSV 数据诊断、统计检验与业务报告生成",
    safety: "本地分析优先，真实密钥只放服务端环境变量",
    dataSource: "数据源",
    chooseFile: "选择 CSV 文件",
    uploadHint: "适合订单、营销、用户行为、A/B 测试数据",
    uploadCsv: "上传 CSV",
    noKeyHint: "默认使用规则版报告；只有本地配置 API Key 并点击 AI 报告时才调用 DeepSeek。",
    currentFile: "当前文件",
    reportSource: "报告来源",
    ruleReport: "规则版模拟 AI",
    emptyTitle: "上传 CSV，生成一份可解释的数据分析报告",
    emptyHint: "先使用左侧示例数据，检查完整分析流程。",
    emptyHint2: "也可以上传上万行 CSV；当前版本会限制预览行数，只展示聚合后的分析结果。",
    processing: "正在处理数据和生成报告，请稍等...",
    rows: "行数",
    columns: "字段",
    duplicateRows: "重复行",
    qualityScore: "健康评分",
    statisticalTests: "统计检验",
    missingRate: "缺失率",
    duplicateRecords: "重复记录",
    dataStatus: "数据状态",
    ready: "适合直接分析",
    cleanFirst: "建议先清洗",
    detectedScenario: "自动识别场景",
    largeMode: "已进入上万行数据模式：建议优先看聚合结果、筛选和下载清洗数据。",
    dataProcessing: "数据处理",
    processingHint: "所有操作都在浏览器本地完成，适合上传后快速清洗和重新分析。",
    dedupe: "一键去重",
    removeEmpty: "删除空行",
    dropMissing: "删除缺失率 > 40% 字段",
    downloadCsv: "下载当前 CSV",
    undo: "撤销上一步",
    reset: "恢复原始数据",
    chooseFilterColumn: "选择筛选字段",
    chooseFilterValue: "选择字段值",
    applyFilter: "应用筛选",
    fieldProfile: "字段画像",
    fieldProfileHint: "识别字段类型、缺失情况、唯一值和样例。",
    descriptiveStats: "描述统计",
    descriptiveStatsHint: "包含均值、中位数、四分位数、标准差和总量。",
    chartsCategory: "类别分布",
    chartsValue: "数值汇总",
    noCategory: "没有识别到适合展示的类别字段。",
    noValue: "没有识别到适合汇总的数值字段。",
    statsHint: "自动选择适合当前字段结构的检验，结果用于探索性分析，不替代严谨实验设计。",
    dataPreview: "数据预览",
    generatingReport: "正在生成报告...",
    reportTitle: "AI 数据分析报告",
    downloadReport: "下载报告",
    reportPlaceholder: "报告会在数据分析完成后自动生成。",
    generateRule: "生成规则报告",
    generateAI: "生成 AI 报告",
    localOnly: "AI 报告只在本地有 API Key 时可用；公开版仍会回退到规则报告。"
  },
  en: {
    subtitle: "CSV diagnostics, statistical tests and business report generation",
    safety: "Local analysis first. Real keys stay in server-side environment variables.",
    dataSource: "Data Source",
    chooseFile: "Choose CSV File",
    uploadHint: "Works for orders, marketing, user behavior and A/B testing data",
    uploadCsv: "Upload CSV",
    noKeyHint: "Default mode uses rule-based reports. DeepSeek is called only when you configure a local API key and click AI report.",
    currentFile: "Current File",
    reportSource: "Report source",
    ruleReport: "Rule-based simulated AI",
    emptyTitle: "Upload a CSV and generate an explainable data report",
    emptyHint: "Start with a sample dataset to review the workflow.",
    emptyHint2: "You can also upload large CSV files; previews are limited and charts use aggregated results.",
    processing: "Processing data and generating report...",
    rows: "Rows",
    columns: "Columns",
    duplicateRows: "Duplicates",
    qualityScore: "Quality",
    statisticalTests: "Tests",
    missingRate: "Missing rate",
    duplicateRecords: "Duplicate records",
    dataStatus: "Data status",
    ready: "Ready to analyze",
    cleanFirst: "Clean first",
    detectedScenario: "Detected scenario",
    largeMode: "Large dataset mode: focus on aggregated results, filters and cleaned CSV export.",
    dataProcessing: "Data Processing",
    processingHint: "All actions run locally in the browser and regenerate the analysis.",
    dedupe: "Deduplicate",
    removeEmpty: "Remove empty rows",
    dropMissing: "Drop >40% missing columns",
    downloadCsv: "Download CSV",
    undo: "Undo",
    reset: "Reset original",
    chooseFilterColumn: "Choose column",
    chooseFilterValue: "Choose value",
    applyFilter: "Apply filter",
    fieldProfile: "Field Profile",
    fieldProfileHint: "Detect field type, missing values, unique values and samples.",
    descriptiveStats: "Descriptive Statistics",
    descriptiveStatsHint: "Mean, median, quartiles, standard deviation and totals.",
    chartsCategory: "Category distribution",
    chartsValue: "Value summary",
    noCategory: "No suitable categorical field was detected.",
    noValue: "No suitable numeric aggregation field was detected.",
    statsHint: "Tests are selected automatically for exploratory analysis, not causal proof.",
    dataPreview: "Data Preview",
    generatingReport: "Generating report...",
    reportTitle: "AI Data Analysis Report",
    downloadReport: "Download Report",
    reportPlaceholder: "The report will be generated after analysis.",
    generateRule: "Generate Rule Report",
    generateAI: "Generate AI Report",
    localOnly: "AI report works only with a local API key. Public version falls back to rule-based report."
  }
};

function isBlank(value: unknown) {
  return value === null || value === undefined || String(value).trim() === "";
}

function rowKey(row: DataRow) {
  return JSON.stringify(
    Object.keys(row)
      .sort()
      .reduce<Record<string, DataRow[string]>>((acc, key) => {
        acc[key] = row[key];
        return acc;
      }, {})
  );
}

function detectScenario(columns: string[], language: Language) {
  const names = new Set(columns.map((column) => column.toLowerCase()));
  const has = (...keys: string[]) => keys.some((key) => names.has(key));

  if (has("experiment_group", "variant", "group") && has("converted", "conversion", "clicked")) {
    return {
      title: language === "en" ? "A/B Test Analysis" : "A/B 实验分析",
      detail:
        language === "en"
          ? "Compare treatment and control groups on clicks, conversions and order value."
          : "适合比较实验组与对照组在点击、转化、客单价等指标上的差异。"
    };
  }

  if (has("campaign_id", "campaign", "cost", "revenue", "leads")) {
    return {
      title: language === "en" ? "Marketing Campaign Analysis" : "渠道投放分析",
      detail:
        language === "en"
          ? "Analyze ad spend, leads, conversions, revenue and ROI performance."
          : "适合分析广告花费、线索、转化、收入和 ROI 表现。"
    };
  }

  if (has("retained_day_30", "retention", "churn", "lifetime_value")) {
    return {
      title: language === "en" ? "User Retention Analysis" : "用户留存分析",
      detail:
        language === "en"
          ? "Compare retention, repeat purchase and lifetime value across segments."
          : "适合观察不同分群、渠道或城市的留存、复购和用户价值差异。"
    };
  }

  if (has("amount", "order_amount", "quantity", "category", "order_id")) {
    return {
      title: language === "en" ? "Sales Performance Analysis" : "销售经营分析",
      detail:
        language === "en"
          ? "Analyze revenue, category, city, channel and customer type performance."
          : "适合分析销售额、品类、城市、渠道和客户类型表现。"
    };
  }

  if (has("y", "duration", "poutcome", "contact", "balance")) {
    return {
      title: language === "en" ? "Marketing Conversion Analysis" : "营销转化分析",
      detail:
        language === "en"
          ? "Analyze customer profiles, contact methods and marketing conversion results."
          : "适合分析客户画像、触达方式和营销转化结果，适合上万行数据测试。"
    };
  }

  return {
    title: language === "en" ? "General Data Diagnostics" : "通用数据诊断",
    detail:
      language === "en"
        ? "Start with data quality checks, descriptive statistics, filtering and exploratory tests."
        : "适合先做数据质量检查、描述统计、筛选和探索性检验。"
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2
  }).format(value);
}

function formatPValue(value: number | null) {
  if (value === null) return "N/A";
  if (value < 0.001) return "<0.001";
  return value.toFixed(3);
}

function buildMarkdownReport(analysis: AnalysisResult, report: Report & { source?: string }, fileName: string) {
  const testRows = analysis.statisticalTests
    .map((test) => `| ${test.name} | ${test.method} | ${test.statistic} | ${formatPValue(test.pValue)} | ${test.conclusion} |`)
    .join("\n");
  const summaryRows = analysis.numericSummary
    .map(
      (item) =>
        `| ${item.name} | ${item.count} | ${formatNumber(item.avg)} | ${formatNumber(item.median)} | ${formatNumber(
          item.std
        )} | ${formatNumber(item.sum)} |`
    )
    .join("\n");

  return `# ${report.title}

数据文件：${fileName}
报告来源：${report.source === "deepseek" ? "DeepSeek" : "规则版模拟 AI"}

## 数据概览

- 行数：${formatNumber(analysis.rowCount)}
- 字段数：${analysis.columnCount}
- 数据健康评分：${analysis.qualityScore}/100
- 缺失率：${(analysis.missingRate * 100).toFixed(2)}%
- 重复行：${analysis.duplicateRows}

## 描述统计

| 字段 | 样本数 | 均值 | 中位数 | 标准差 | 总量 |
| --- | ---: | ---: | ---: | ---: | ---: |
${summaryRows || "| 暂无 | 0 | 0 | 0 | 0 | 0 |"}

## 统计检验

| 检验 | 方法 | 统计量 | p-value | 结论 |
| --- | --- | --- | ---: | --- |
${testRows || "| 暂无 | 当前字段不足 | N/A | N/A | 暂无 |"}

## 关键发现

${report.findings.map((item) => `- ${item}`).join("\n")}

## 行动建议

${report.actions.map((item) => `- ${item}`).join("\n")}
`;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadCsvFile(filename: string, data: DataRow[]) {
  const csv = Papa.unparse(data);
  downloadTextFile(filename, csv);
}

async function readCsvFile(file: File) {
  return new Promise<DataRow[]>((resolve, reject) => {
    Papa.parse<DataRow>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      worker: true,
      complete: (result) => resolve(result.data),
      error: reject
    });
  });
}

async function readSampleCsv(path: string) {
  const response = await fetch(path);
  const text = await response.text();
  const result = Papa.parse<DataRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  });
  return result.data;
}

async function requestReport(analysis: AnalysisResult, language: Language, useAI = false) {
  const response = await fetch("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysis, language, useAI })
  });

  return (await response.json()) as Report & { source?: string };
}

export default function Home() {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [originalRows, setOriginalRows] = useState<DataRow[]>([]);
  const [history, setHistory] = useState<DataRow[][]>([]);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [language, setLanguage] = useState<Language>("zh");

  const analysis = useMemo(() => (rows.length ? analyzeRows(rows) : null), [rows]);
  const text = uiText[language];
  const previewRows = rows.slice(0, 6);
  const previewColumns = Object.keys(previewRows[0] ?? {});
  const scenario = useMemo(() => detectScenario(previewColumns, language), [previewColumns, language]);
  const filterOptions = useMemo(() => {
    if (!filterColumn) return [];
    return Array.from(new Set(rows.map((row) => String(row[filterColumn] ?? "")).filter(Boolean))).slice(0, 60);
  }, [filterColumn, rows]);

  async function handleRows(nextRows: DataRow[], sourceName: string, options?: { resetOriginal?: boolean; pushHistory?: boolean }) {
    setProcessing(true);
    if (options?.pushHistory) {
      setHistory((current) => [...current, rows]);
    }
    if (options?.resetOriginal) {
      setOriginalRows(nextRows);
      setHistory([]);
    }
    setRows(nextRows);
    setFileName(sourceName);
    setFilterColumn("");
    setFilterValue("");
    const nextAnalysis = analyzeRows(nextRows);
    setLoadingReport(true);
    setReport(await requestReport(nextAnalysis, language, false));
    setLoadingReport(false);
    setProcessing(false);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextRows = await readCsvFile(file);
    await handleRows(nextRows, file.name, { resetOriginal: true });
  }

  async function loadSample(path: string, sourceName: string) {
    const nextRows = await readSampleCsv(path);
    await handleRows(nextRows, sourceName, { resetOriginal: true });
  }

  async function applyRows(nextRows: DataRow[], suffix: string) {
    await handleRows(nextRows, `${fileName || "dataset"} ${suffix}`, { pushHistory: true });
  }

  async function removeDuplicateRows() {
    const seen = new Set<string>();
    const nextRows = rows.filter((row) => {
      const key = rowKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    await applyRows(nextRows, "| 已去重");
  }

  async function removeEmptyRows() {
    const nextRows = rows.filter((row) => Object.values(row).some((value) => !isBlank(value)));
    await applyRows(nextRows, "| 已删除空行");
  }

  async function dropHighMissingColumns() {
    if (!analysis) return;
    const keepColumns = analysis.columns
      .filter((column) => column.missing / Math.max(analysis.rowCount, 1) <= 0.4)
      .map((column) => column.name);
    const nextRows = rows.map((row) =>
      keepColumns.reduce<DataRow>((acc, column) => {
        acc[column] = row[column];
        return acc;
      }, {})
    );
    await applyRows(nextRows, "| 已删除高缺失字段");
  }

  async function applyValueFilter() {
    if (!filterColumn || !filterValue) return;
    const nextRows = rows.filter((row) => String(row[filterColumn] ?? "") === filterValue);
    await applyRows(nextRows, `| 已筛选 ${filterColumn}=${filterValue}`);
  }

  async function undoLastAction() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    await handleRows(previous, `${fileName || "dataset"} | 已撤销`);
  }

  async function resetOriginalData() {
    if (!originalRows.length) return;
    await handleRows(originalRows, fileName.split("|")[0].trim() || "dataset", { resetOriginal: true });
  }

  async function generateReport(useAI: boolean) {
    if (!analysis) return;
    setLoadingReport(true);
    setReport(await requestReport(analysis, language, useAI));
    setLoadingReport(false);
  }

  function downloadReport() {
    if (!analysis || !report) return;
    downloadTextFile("ai-data-analysis-report.md", buildMarkdownReport(analysis, report, fileName));
  }

  function downloadCleanedCsv() {
    downloadCsvFile("cleaned-data.csv", rows);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>AI Data Report Assistant</strong>
            <span>{text.subtitle}</span>
          </div>
          <div className="topbar-actions">
            <div className="segmented-control" aria-label="Language">
              <button className={language === "zh" ? "active" : ""} type="button" onClick={() => setLanguage("zh")}>
                中文
              </button>
              <button className={language === "en" ? "active" : ""} type="button" onClick={() => setLanguage("en")}>
                EN
              </button>
            </div>
            <div className="safe-note">{text.safety}</div>
          </div>
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <section className="panel">
            <h2>{text.dataSource}</h2>
            <div className="upload-zone">
              <label>
                <div className="upload-title">{text.chooseFile}</div>
                <div className="hint">{text.uploadHint}</div>
                <span className="upload-button">{text.uploadCsv}</span>
                <input className="file-input" type="file" accept=".csv" onChange={handleFileChange} />
              </label>
            </div>

            <div className="scenario-list">
              {sampleScenarios.map((scenario) => (
                <button
                  className="scenario-button"
                  key={scenario.path}
                  type="button"
                  onClick={() => loadSample(scenario.path, scenario.fileName)}
                >
                  <strong>{language === "en" ? scenario.enLabel : scenario.label}</strong>
                  <span>{language === "en" ? scenario.enDescription : scenario.description}</span>
                </button>
              ))}
            </div>

            <p className="hint">
              {text.noKeyHint}
            </p>
          </section>

          {analysis ? (
            <section className="panel compact-panel">
              <h2>{text.currentFile}</h2>
              <p className="file-name">{fileName}</p>
              <p className="hint">{text.reportSource}：{report?.source === "deepseek" ? "DeepSeek" : text.ruleReport}</p>
              {report?.aiError ? <p className="error-note">{report.aiError}</p> : null}
            </section>
          ) : null}
        </aside>

        <section className="content">
          {!analysis ? (
            <section className="empty">
              <div>
                <p className="eyebrow">Portfolio Demo</p>
                <h1>{text.emptyTitle}</h1>
                <p className="muted">{text.emptyHint}</p>
                <p className="muted">{text.emptyHint2}</p>
              </div>
            </section>
          ) : (
            <>
              {processing || loadingReport ? (
                <section className="process-banner">{text.processing}</section>
              ) : null}

              <section className="metrics">
                <div className="metric">
                  <span>{text.rows}</span>
                  <strong>{formatNumber(analysis.rowCount)}</strong>
                </div>
                <div className="metric">
                  <span>{text.columns}</span>
                  <strong>{analysis.columnCount}</strong>
                </div>
                <div className="metric">
                  <span>{text.duplicateRows}</span>
                  <strong>{analysis.duplicateRows}</strong>
                </div>
                <div className="metric">
                  <span>{text.qualityScore}</span>
                  <strong>{analysis.qualityScore}</strong>
                </div>
                <div className="metric">
                  <span>{text.statisticalTests}</span>
                  <strong>{analysis.statisticalTests.length}</strong>
                </div>
              </section>

              <section className="quality-strip">
                <div>
                  <span>{text.missingRate}</span>
                  <strong>{(analysis.missingRate * 100).toFixed(2)}%</strong>
                </div>
                <div>
                  <span>{text.duplicateRecords}</span>
                  <strong>{analysis.duplicateRows} 行</strong>
                </div>
                <div>
                  <span>{text.dataStatus}</span>
                  <strong>{analysis.qualityScore >= 90 ? text.ready : text.cleanFirst}</strong>
                </div>
              </section>

              <section className="scenario-strip">
                <div>
                  <span>{text.detectedScenario}</span>
                  <strong>{scenario.title}</strong>
                </div>
                <p>{scenario.detail}</p>
                {analysis.rowCount >= 10000 ? <em>{text.largeMode}</em> : null}
              </section>

              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>{text.dataProcessing}</h2>
                    <p className="hint">{text.processingHint}</p>
                  </div>
                </div>
                <div className="action-grid">
                  <button className="action-button" type="button" onClick={removeDuplicateRows}>
                    {text.dedupe}
                  </button>
                  <button className="action-button" type="button" onClick={removeEmptyRows}>
                    {text.removeEmpty}
                  </button>
                  <button className="action-button" type="button" onClick={dropHighMissingColumns}>
                    {text.dropMissing}
                  </button>
                  <button className="action-button" type="button" onClick={downloadCleanedCsv}>
                    {text.downloadCsv}
                  </button>
                  <button className="action-button" type="button" onClick={undoLastAction} disabled={!history.length}>
                    {text.undo}
                  </button>
                  <button className="action-button" type="button" onClick={resetOriginalData} disabled={!originalRows.length}>
                    {text.reset}
                  </button>
                </div>
                <div className="filter-row">
                  <select value={filterColumn} onChange={(event) => setFilterColumn(event.target.value)}>
                    <option value="">{text.chooseFilterColumn}</option>
                    {analysis.columns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name}
                      </option>
                    ))}
                  </select>
                  <select value={filterValue} onChange={(event) => setFilterValue(event.target.value)} disabled={!filterColumn}>
                    <option value="">{text.chooseFilterValue}</option>
                    {filterOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <button className="action-button" type="button" onClick={applyValueFilter} disabled={!filterColumn || !filterValue}>
                    {text.applyFilter}
                  </button>
                </div>
              </section>

              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>{text.fieldProfile}</h2>
                    <p className="hint">{text.fieldProfileHint}</p>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>字段</th>
                        <th>类型</th>
                        <th>缺失</th>
                        <th>唯一值</th>
                        <th>样例</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.columns.map((column) => (
                        <tr key={column.name}>
                          <td>{column.name}</td>
                          <td>{column.type}</td>
                          <td className={column.missing ? "status-warn" : "status-good"}>{column.missing}</td>
                          <td>{column.unique}</td>
                          <td>{column.sample}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>{text.descriptiveStats}</h2>
                    <p className="hint">{text.descriptiveStatsHint}</p>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>字段</th>
                        <th>样本数</th>
                        <th>均值</th>
                        <th>中位数</th>
                        <th>标准差</th>
                        <th>Q1</th>
                        <th>Q3</th>
                        <th>最小值</th>
                        <th>最大值</th>
                        <th>总量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.numericSummary.map((item) => (
                        <tr key={item.name}>
                          <td>{item.name}</td>
                          <td>{item.count}</td>
                          <td>{formatNumber(item.avg)}</td>
                          <td>{formatNumber(item.median)}</td>
                          <td>{formatNumber(item.std)}</td>
                          <td>{formatNumber(item.q1)}</td>
                          <td>{formatNumber(item.q3)}</td>
                          <td>{formatNumber(item.min)}</td>
                          <td>{formatNumber(item.max)}</td>
                          <td>{formatNumber(item.sum)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="charts">
                <div className="chart-card">
                  <h3>{analysis.categoryChart?.field ?? text.chartsCategory}</h3>
                  {analysis.categoryChart ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analysis.categoryChart.rows}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#1f6f62" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="muted">{text.noCategory}</p>
                  )}
                </div>

                <div className="chart-card">
                  <h3>{analysis.valueChart?.field ?? text.chartsValue}</h3>
                  {analysis.valueChart ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analysis.valueChart.rows}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#455a7d" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="muted">{text.noValue}</p>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>{text.statisticalTests}</h2>
                    <p className="hint">{text.statsHint}</p>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>检验</th>
                        <th>方法</th>
                        <th>统计量</th>
                        <th>p-value</th>
                        <th>结论</th>
                        <th>说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.statisticalTests.map((test) => (
                        <tr key={`${test.name}-${test.method}`}>
                          <td>{test.name}</td>
                          <td>{test.method}</td>
                          <td>{test.statistic}</td>
                          <td>{formatPValue(test.pValue)}</td>
                          <td>{test.conclusion}</td>
                          <td>{test.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="grid-2">
                <div className="panel">
                  <h2>{text.dataPreview}</h2>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {previewColumns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, index) => (
                          <tr key={index}>
                            {previewColumns.map((column) => (
                              <td key={column}>{String(row[column] ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <section className="report">
                  <div className="report-header">
                    <h2>{loadingReport ? text.generatingReport : report?.title ?? text.reportTitle}</h2>
                    <div className="report-actions">
                      <button className="text-button" type="button" onClick={() => generateReport(false)} disabled={!analysis || loadingReport}>
                        {text.generateRule}
                      </button>
                      <button className="text-button" type="button" onClick={() => generateReport(true)} disabled={!analysis || loadingReport}>
                        {text.generateAI}
                      </button>
                      <button className="text-button" type="button" onClick={downloadReport} disabled={!report}>
                        {text.downloadReport}
                      </button>
                    </div>
                  </div>
                  <p className="hint">{text.localOnly}</p>
                  {report?.aiError ? <p className="error-note">{report.aiError}</p> : null}
                  {report ? (
                    <div className="report-content">
                      <p>{report.summary}</p>
                      <h3>关键发现</h3>
                      <ul>
                        {report.findings.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                      <h3>行动建议</h3>
                      <ul>
                        {report.actions.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="muted">{text.reportPlaceholder}</p>
                  )}
                </section>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
