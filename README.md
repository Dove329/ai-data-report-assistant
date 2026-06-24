# AI Data Report Assistant

[Live Demo](https://ai-data-report-assistant.netlify.app) | [GitHub Repository](https://github.com/Dove329/ai-data-report-assistant)

AI Data Report Assistant 是一个面向 CSV 数据分析场景的 Web 原型工具。项目围绕“数据诊断 - 数据清洗 - 描述统计 - 探索性检验 - 可视化 - 报告生成”的完整分析流程设计，探索如何把 AI 辅助编程、数据分析方法和业务报告表达结合起来。

本项目的重点不是把 LLM 当作直接下结论的黑箱，而是采用“程序计算真实指标 + LLM 辅助业务表达”的思路：统计指标、缺失值、重复行、图表数据和检验结果由代码计算得到，AI 主要用于组织解释语言和生成更易读的分析报告。

## Demo

- Online demo: <https://ai-data-report-assistant.netlify.app>
- Repository: <https://github.com/Dove329/ai-data-report-assistant>

公开演示版默认使用规则报告，不需要 API Key。配置 DeepSeek API Key 后，可在本地或受控部署环境中生成 AI 报告。

## 项目背景

在运营分析、商业分析和数据分析实习场景中，CSV 数据通常需要经过字段识别、质量检查、缺失值处理、重复值处理、描述统计、图表展示和结论汇报等步骤。传统流程容易分散在 Excel、Python 脚本和文档之间，分析效率和表达一致性都不稳定。

本项目尝试把这些常见步骤整合进一个轻量工具，让用户上传 CSV 后，可以快速获得数据质量诊断、基础统计结果、探索性检验、可视化图表和结构化分析报告。

## 核心功能

- CSV 上传与浏览器端解析
- 中文 / English 界面切换
- 自动识别分析场景：销售经营、A/B 实验、渠道投放、用户留存、营销转化、通用数据诊断
- 字段画像：字段类型、缺失值、唯一值、样例值
- 数据质量诊断：缺失率、重复行、数据健康评分
- 数据清洗操作：一键去重、删除空行、删除高缺失字段、字段值筛选、撤销上一步、恢复原始数据
- 描述统计：均值、中位数、四分位数、标准差、最大值、最小值、总量
- 探索性统计检验：Pearson 相关性、Welch t 检验、卡方独立性检验、两比例 Z 检验
- 图表展示：类别分布、数值汇总
- 报告生成：规则版分析报告、Markdown 报告下载、DeepSeek API 接入预留
- 数据导出：下载当前清洗后的 CSV

## 内置示例场景

项目提供 4 类示例 CSV，用于快速体验完整流程：

- 电商销售：GMV、品类、城市、渠道
- A/B 实验：曝光、点击、转化、客单价
- 渠道投放：花费、线索、转化、ROI
- 用户留存：分群、活跃、留存、复购

也可以上传公开数据集进行测试，例如 UCI Bank Marketing 的 `bank-full.csv`，用于验证上万行 CSV 的本地分析能力。

## AI 应用设计

本项目采用分层设计，降低 AI 直接编造统计结论的风险：

1. 数据解析、字段识别、缺失值、重复值、描述统计和检验结果由代码计算。
2. LLM 不直接生成未经验证的数值结论，而是基于已计算结果生成业务化表达。
3. 未配置 API Key 时，系统回退到规则版报告，公开演示也可以完整运行。
4. API Key 只应放在服务端环境变量中，不写入前端代码，也不提交到 GitHub。

## 我的角色

我主要负责数据分析流程设计、功能需求拆解、指标逻辑判断、分析报告结构设计，并借助 AI 辅助编程完成 Web 工具原型实现。项目过程中，我重点关注两件事：

- 分析结果是否来自真实计算，而不是由模型直接生成。
- 报告表达是否能把统计结果转化为清晰、可执行的业务语言。

这个项目更适合作为“AI 与数据分析结合能力”的展示，而不是单纯的软件工程项目。

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- PapaParse
- Recharts
- DeepSeek API ready
- Netlify deployment

## Local Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## DeepSeek API

The app works without an API key. Public demos can use rule-based reports.

To enable DeepSeek report generation locally, create `.env.local`:

```text
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

Do not commit `.env.local` or any real API key to GitHub.

Usage:

1. Run the app locally.
2. Upload a CSV or choose a sample dataset.
3. Click `Generate AI Report`.
4. If `DEEPSEEK_API_KEY` exists, the server-side API route calls DeepSeek.
5. If no key exists or the request fails, the app falls back to the rule-based report.

## Large CSV Test

Recommended dataset:

- Dataset: <https://archive.ics.uci.edu/dataset/222/bank+marketing>
- File: `bank-full.csv`
- Rows: about 45,211
- Scenario: marketing conversion analysis

Steps:

1. Download the dataset from UCI.
2. Extract the zip file.
3. Upload `bank-full.csv` in the app.
4. Review data quality, statistical tests, charts, cleaning actions and generated report.

The current version is suitable for several thousand to tens of thousands of CSV rows. For hundreds of thousands of rows or more, a backend or database-based analysis layer would be more appropriate.

## Interview Talking Points

- 能把数据分析流程产品化：从 CSV 上传到质量诊断、统计检验、图表和报告输出。
- 能区分“计算”和“表达”：代码负责真实指标，AI 负责报告表达和解释组织。
- 能支持多类业务场景：A/B 实验、渠道投放、用户留存、营销转化和通用数据诊断。
- 关注分析可信度：避免让模型直接编造统计结论。
- 关注安全边界：公开演示默认不消耗个人 API 额度，真实 Key 只放服务端环境变量。
- 能使用 AI 辅助编程把数据分析想法快速落成可演示原型。

## Resume Description

可以在简历中概括为：

> 基于数据分析流程设计 AI 数据分析报告助手，借助 AI 辅助编程完成 Web 原型实现，支持 CSV 上传后的数据诊断、清洗、统计分析、可视化与报告生成；采用“代码计算真实指标 + LLM 生成业务表达”的思路，探索 AI 在数据分析交付中的提效价值。
