export type DataRow = Record<string, string | number | boolean | null>;

export type ColumnProfile = {
  name: string;
  type: "number" | "date" | "text";
  missing: number;
  unique: number;
  sample: string;
};

export type NumericSummary = {
  name: string;
  count: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  avg: number;
  std: number;
  sum: number;
};

export type StatisticalTest = {
  name: string;
  method: string;
  statistic: string;
  pValue: number | null;
  conclusion: string;
  detail: string;
};

export type AnalysisResult = {
  rowCount: number;
  columnCount: number;
  duplicateRows: number;
  qualityScore: number;
  missingRate: number;
  columns: ColumnProfile[];
  numericSummary: NumericSummary[];
  statisticalTests: StatisticalTest[];
  categoryChart: {
    field: string;
    rows: { name: string; value: number }[];
  } | null;
  valueChart: {
    field: string;
    rows: { name: string; value: number }[];
  } | null;
  insights: string[];
};

const emptyValues = new Set(["", "null", "undefined", "nan", "n/a", "-"]);

function isMissing(value: unknown) {
  return value === null || value === undefined || emptyValues.has(String(value).trim().toLowerCase());
}

function toNumber(value: unknown) {
  if (isMissing(value)) return null;
  const normalized = String(value).replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function looksLikeDate(value: unknown) {
  if (isMissing(value)) return false;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed);
}

function inferColumnType(values: unknown[]): ColumnProfile["type"] {
  const present = values.filter((value) => !isMissing(value));
  if (present.length === 0) return "text";

  const numberLike = present.filter((value) => toNumber(value) !== null).length;
  const dateLike = present.filter(looksLikeDate).length;
  const threshold = present.length * 0.8;

  if (numberLike >= threshold) return "number";
  if (dateLike >= threshold) return "date";
  return "text";
}

function countDuplicateRows(rows: DataRow[]) {
  const seen = new Set<string>();
  let duplicates = 0;

  rows.forEach((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  });

  return duplicates;
}

function mean(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return values.reduce((total, value) => total + (value - avg) ** 2, 0) / (values.length - 1);
}

function quantile(values: number[], q: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

function erf(x: number) {
  const sign = x >= 0 ? 1 : -1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-abs * abs));
  return sign * y;
}

function normalCdf(z: number) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function twoSidedPFromZ(z: number) {
  return Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))));
}

function pLabel(pValue: number | null) {
  if (pValue === null) return "仅作探索性参考";
  if (pValue < 0.01) return "差异高度显著";
  if (pValue < 0.05) return "差异显著";
  if (pValue < 0.1) return "边际显著";
  return "未发现显著差异";
}

function pearson(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 3) return null;
  const xMean = mean(x);
  const yMean = mean(y);
  let numerator = 0;
  let xVar = 0;
  let yVar = 0;

  x.forEach((value, index) => {
    const xd = value - xMean;
    const yd = y[index] - yMean;
    numerator += xd * yd;
    xVar += xd ** 2;
    yVar += yd ** 2;
  });

  if (xVar === 0 || yVar === 0) return null;
  return numerator / Math.sqrt(xVar * yVar);
}

function getNumericValues(rows: DataRow[], field: string) {
  return rows.map((row) => toNumber(row[field])).filter((value): value is number => value !== null);
}

function pickCategoryColumn(columns: ColumnProfile[]) {
  return columns
    .filter((column) => column.type === "text" && column.unique > 1 && column.unique <= 20)
    .sort((a, b) => b.unique - a.unique)[0];
}

function pickNumericColumn(summary: NumericSummary[]) {
  return [...summary].sort((a, b) => b.sum - a.sum)[0];
}

function buildNumericSummary(rows: DataRow[], columns: ColumnProfile[]) {
  return columns
    .filter((column) => column.type === "number")
    .map((column) => {
      const values = getNumericValues(rows, column.name);
      const sum = values.reduce((total, value) => total + value, 0);

      return {
        name: column.name,
        count: values.length,
        min: Math.min(...values),
        q1: quantile(values, 0.25),
        median: quantile(values, 0.5),
        q3: quantile(values, 0.75),
        max: Math.max(...values),
        avg: mean(values),
        std: Math.sqrt(variance(values)),
        sum
      };
    });
}

function buildCorrelationTest(rows: DataRow[], numericColumns: NumericSummary[]): StatisticalTest | null {
  if (numericColumns.length < 2) return null;

  let best:
    | {
        xName: string;
        yName: string;
        r: number;
        n: number;
      }
    | null = null;

  for (let i = 0; i < numericColumns.length; i += 1) {
    for (let j = i + 1; j < numericColumns.length; j += 1) {
      const pairs = rows
        .map((row) => [toNumber(row[numericColumns[i].name]), toNumber(row[numericColumns[j].name])])
        .filter((pair): pair is [number, number] => pair[0] !== null && pair[1] !== null);
      const r = pearson(
        pairs.map((pair) => pair[0]),
        pairs.map((pair) => pair[1])
      );

      if (r !== null && (!best || Math.abs(r) > Math.abs(best.r))) {
        best = {
          xName: numericColumns[i].name,
          yName: numericColumns[j].name,
          r,
          n: pairs.length
        };
      }
    }
  }

  if (!best || best.n < 3 || Math.abs(best.r) >= 1) return null;
  const zApprox = Math.abs(best.r) * Math.sqrt((best.n - 2) / (1 - best.r ** 2));
  const pValue = twoSidedPFromZ(zApprox);

  return {
    name: "相关性检验",
    method: "Pearson correlation",
    statistic: `r=${best.r.toFixed(3)}`,
    pValue,
    conclusion: pLabel(pValue),
    detail: `${best.xName} 与 ${best.yName} 的线性相关程度最高，样本量 n=${best.n}。`
  };
}

function buildTTest(rows: DataRow[], categoryColumn: ColumnProfile | undefined, numericColumn: NumericSummary | undefined) {
  if (!categoryColumn || !numericColumn) return null;
  const groups = Object.entries(
    rows.reduce<Record<string, number[]>>((acc, row) => {
      const key = String(row[categoryColumn.name] || "Unknown");
      const value = toNumber(row[numericColumn.name]);
      if (value !== null) {
        acc[key] = acc[key] || [];
        acc[key].push(value);
      }
      return acc;
    }, {})
  )
    .filter(([, values]) => values.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  if (groups.length < 2) return null;

  const [groupA, groupB] = groups;
  const meanA = mean(groupA[1]);
  const meanB = mean(groupB[1]);
  const varA = variance(groupA[1]);
  const varB = variance(groupB[1]);
  const se = Math.sqrt(varA / groupA[1].length + varB / groupB[1].length);
  if (se === 0) return null;

  const t = (meanA - meanB) / se;
  const pValue = twoSidedPFromZ(t);

  return {
    name: "均值差异检验",
    method: "Welch two-sample t-test",
    statistic: `t=${t.toFixed(3)}`,
    pValue,
    conclusion: pLabel(pValue),
    detail: `比较 ${categoryColumn.name} 中 ${groupA[0]} 与 ${groupB[0]} 的 ${numericColumn.name} 均值差异。`
  };
}

function buildChiSquareTest(rows: DataRow[], columns: ColumnProfile[]) {
  const textColumns = columns.filter((column) => column.type === "text" && column.unique > 1 && column.unique <= 10);
  if (textColumns.length < 2) return null;

  const [rowField, colField] = textColumns;
  const rowKeys = Array.from(new Set(rows.map((row) => String(row[rowField.name] || "Unknown"))));
  const colKeys = Array.from(new Set(rows.map((row) => String(row[colField.name] || "Unknown"))));
  if (rowKeys.length < 2 || colKeys.length < 2) return null;

  const table = rowKeys.map((rowKey) =>
    colKeys.map(
      (colKey) =>
        rows.filter((row) => String(row[rowField.name] || "Unknown") === rowKey && String(row[colField.name] || "Unknown") === colKey)
          .length
    )
  );

  const rowTotals = table.map((row) => row.reduce((total, value) => total + value, 0));
  const colTotals = colKeys.map((_, colIndex) => table.reduce((total, row) => total + row[colIndex], 0));
  const total = rowTotals.reduce((sum, value) => sum + value, 0);
  let chiSquare = 0;

  table.forEach((row, rowIndex) => {
    row.forEach((observed, colIndex) => {
      const expected = (rowTotals[rowIndex] * colTotals[colIndex]) / total;
      if (expected > 0) chiSquare += (observed - expected) ** 2 / expected;
    });
  });

  const df = (rowKeys.length - 1) * (colKeys.length - 1);
  if (df <= 0) return null;
  const zApprox = (Math.pow(chiSquare / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  const pValue = 1 - normalCdf(zApprox);

  return {
    name: "分类变量关系检验",
    method: "Chi-square independence test",
    statistic: `χ²=${chiSquare.toFixed(3)}, df=${df}`,
    pValue,
    conclusion: pLabel(pValue),
    detail: `检验 ${rowField.name} 与 ${colField.name} 是否存在统计关联。`
  };
}

function buildProportionTest(rows: DataRow[], categoryColumn: ColumnProfile | undefined, numericColumns: NumericSummary[]) {
  if (!categoryColumn) return null;
  const binaryColumn = numericColumns.find((column) => {
    const values = new Set(getNumericValues(rows, column.name));
    return values.size === 2 && values.has(0) && values.has(1);
  });
  if (!binaryColumn) return null;

  const groups = Object.entries(
    rows.reduce<Record<string, { success: number; total: number }>>((acc, row) => {
      const key = String(row[categoryColumn.name] || "Unknown");
      const value = toNumber(row[binaryColumn.name]);
      if (value !== null) {
        acc[key] = acc[key] || { success: 0, total: 0 };
        acc[key].success += value === 1 ? 1 : 0;
        acc[key].total += 1;
      }
      return acc;
    }, {})
  )
    .filter(([, value]) => value.total >= 2)
    .sort((a, b) => b[1].total - a[1].total);

  if (groups.length < 2) return null;
  const [groupA, groupB] = groups;
  const pA = groupA[1].success / groupA[1].total;
  const pB = groupB[1].success / groupB[1].total;
  const pooled = (groupA[1].success + groupB[1].success) / (groupA[1].total + groupB[1].total);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / groupA[1].total + 1 / groupB[1].total));
  if (se === 0) return null;
  const z = (pA - pB) / se;
  const pValue = twoSidedPFromZ(z);

  return {
    name: "转化率差异检验",
    method: "Two-proportion z-test",
    statistic: `z=${z.toFixed(3)}`,
    pValue,
    conclusion: pLabel(pValue),
    detail: `比较 ${categoryColumn.name} 中 ${groupA[0]} 与 ${groupB[0]} 的 ${binaryColumn.name} 比例差异。`
  };
}

function buildStatisticalTests(rows: DataRow[], columns: ColumnProfile[], numericSummary: NumericSummary[]) {
  const categoryColumn = pickCategoryColumn(columns);
  const numericColumn = pickNumericColumn(numericSummary);
  return [
    buildCorrelationTest(rows, numericSummary),
    buildTTest(rows, categoryColumn, numericColumn),
    buildChiSquareTest(rows, columns),
    buildProportionTest(rows, categoryColumn, numericSummary)
  ].filter((test): test is StatisticalTest => test !== null);
}

function calculateQualityScore(rowCount: number, columnCount: number, duplicateRows: number, totalMissing: number) {
  if (rowCount === 0 || columnCount === 0) return 0;
  const totalCells = rowCount * columnCount;
  const missingPenalty = (totalMissing / totalCells) * 45;
  const duplicatePenalty = (duplicateRows / rowCount) * 35;
  const sizePenalty = rowCount < 20 ? 8 : 0;
  return Math.max(0, Math.round(100 - missingPenalty - duplicatePenalty - sizePenalty));
}

export function analyzeRows(rows: DataRow[]): AnalysisResult {
  const cleanedRows = rows.filter((row) => Object.values(row).some((value) => !isMissing(value)));
  const columnNames = Object.keys(cleanedRows[0] ?? {});

  const columns = columnNames.map((name) => {
    const values = cleanedRows.map((row) => row[name]);
    const present = values.filter((value) => !isMissing(value));

    return {
      name,
      type: inferColumnType(values),
      missing: values.length - present.length,
      unique: new Set(present.map(String)).size,
      sample: present.slice(0, 3).map(String).join(", ")
    };
  });

  const numericSummary = buildNumericSummary(cleanedRows, columns);
  const categoryColumn = pickCategoryColumn(columns);
  const numericColumn = pickNumericColumn(numericSummary);
  const statisticalTests = buildStatisticalTests(cleanedRows, columns, numericSummary);

  const categoryChart = categoryColumn
    ? {
        field: categoryColumn.name,
        rows: Object.entries(
          cleanedRows.reduce<Record<string, number>>((acc, row) => {
            const key = String(row[categoryColumn.name] || "Unknown");
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {})
        )
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)
      }
    : null;

  const valueChart =
    categoryColumn && numericColumn
      ? {
          field: `${categoryColumn.name} x ${numericColumn.name}`,
          rows: Object.entries(
            cleanedRows.reduce<Record<string, number>>((acc, row) => {
              const key = String(row[categoryColumn.name] || "Unknown");
              acc[key] = (acc[key] || 0) + (toNumber(row[numericColumn.name]) || 0);
              return acc;
            }, {})
          )
            .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
        }
      : null;

  const totalMissing = columns.reduce((sum, column) => sum + column.missing, 0);
  const duplicateRows = countDuplicateRows(cleanedRows);
  const missingRate = cleanedRows.length && columnNames.length ? totalMissing / (cleanedRows.length * columnNames.length) : 0;
  const qualityScore = calculateQualityScore(cleanedRows.length, columnNames.length, duplicateRows, totalMissing);
  const insights = [
    `数据包含 ${cleanedRows.length} 行、${columnNames.length} 个字段，可用于数据质量检查、描述统计和探索性检验。`,
    `数据健康评分为 ${qualityScore}/100，缺失率为 ${(missingRate * 100).toFixed(2)}%。`,
    totalMissing > 0
      ? `发现 ${totalMissing} 个缺失值，建议先确认缺失机制，再决定填补、删除或单独标记。`
      : "未发现明显缺失值，数据完整性表现较好。",
    duplicateRows > 0
      ? `发现 ${duplicateRows} 行重复记录，建议去重后再计算关键指标。`
      : "未发现完全重复行，重复记录风险较低。",
    numericColumn
      ? `${numericColumn.name} 是当前最重要的数值字段之一，总量为 ${numericColumn.sum.toFixed(2)}，均值为 ${numericColumn.avg.toFixed(2)}，标准差为 ${numericColumn.std.toFixed(2)}。`
      : "当前数据中缺少可直接统计的数值字段，建议补充金额、次数、点击量或转化量等指标。",
    statisticalTests.length
      ? `系统自动生成 ${statisticalTests.length} 项探索性统计检验，适合用于发现值得进一步验证的问题。`
      : "当前字段结构不足以自动生成统计检验，建议补充分类变量和数值变量。"
  ];

  return {
    rowCount: cleanedRows.length,
    columnCount: columnNames.length,
    duplicateRows,
    qualityScore,
    missingRate,
    columns,
    numericSummary,
    statisticalTests,
    categoryChart,
    valueChart,
    insights
  };
}

export function buildRuleBasedReport(analysis: AnalysisResult) {
  const qualityLevel =
    analysis.duplicateRows === 0 && analysis.columns.every((column) => column.missing === 0) ? "较好" : "需要进一步处理";

  const topValue = analysis.valueChart?.rows[0];
  const topCategory = analysis.categoryChart?.rows[0];
  const significantTests = analysis.statisticalTests.filter((test) => test.pValue !== null && test.pValue < 0.05);

  return {
    source: "rule-based",
    title: "AI 数据分析报告",
    summary: `本次数据共包含 ${analysis.rowCount} 行、${analysis.columnCount} 个字段，数据质量整体${qualityLevel}。系统已完成描述统计、字段画像和探索性统计检验。`,
    findings: [
      ...analysis.insights,
      topCategory
        ? `${analysis.categoryChart?.field} 中，${topCategory.name} 的记录数最高，共 ${topCategory.value} 条。`
        : "暂未识别到适合做类别对比的字段。",
      topValue
        ? `${analysis.valueChart?.field} 中，${topValue.name} 的累计表现最高，数值为 ${topValue.value}。`
        : "暂未识别到适合做金额或数量汇总的字段。",
      significantTests.length
        ? `统计检验中有 ${significantTests.length} 项达到 5% 显著性水平，可作为后续业务假设的重点。`
        : "当前统计检验未发现 5% 显著性水平下的强差异，建议扩大样本或细分口径继续观察。"
    ],
    actions: [
      "先处理缺失值和重复行，避免基础口径影响后续结论。",
      "围绕表现最高和最低的类别做对比，寻找渠道、地区或品类差异。",
      "将显著性检验结果转化为业务假设，再用更大样本或 A/B 测试验证。",
      "接入 DeepSeek 后，可把这些统计结果转成更自然的业务报告。"
    ]
  };
}
