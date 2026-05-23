# AI Data Report Assistant

面向数据分析、运营分析和商业分析求职场景的 AI Data Analysis Agent 原型。用户上传 CSV 后，系统会自动完成数据质量诊断、字段画像、描述统计、探索性统计检验、图表生成、数据清洗操作和业务分析报告输出。

项目采用“代码计算真实指标 + AI 负责业务表达”的设计思路：缺失率、重复行、均值、标准差、p-value 等指标由程序计算，报告文本可由规则版生成，也预留 DeepSeek API 接入能力，避免让模型直接编造统计结论。

## Demo Scenarios

内置 4 类常见数据分析场景：

- 电商销售：GMV、品类、城市、渠道
- A/B 实验：曝光、点击、转化、客单价
- 渠道投放：花费、线索、转化、ROI
- 用户留存：分群、活跃、留存、复购

也支持上传公开大数据集，例如 UCI Bank Marketing 的 `bank-full.csv`，约 45,211 行，用于测试上万行 CSV 的本地分析能力。

## Features

- 上传 CSV 文件并自动解析
- 中文 / English 界面切换
- 自动识别分析场景：销售经营、A/B 实验、渠道投放、用户留存、营销转化、通用诊断
- 字段画像：字段类型、缺失值、唯一值、样例
- 数据质量：缺失率、重复行、健康评分
- 数据处理：一键去重、删除空行、删除高缺失字段、字段值筛选、撤销上一步、恢复原始数据
- 描述统计：均值、中位数、四分位数、标准差、最大值、最小值、总量
- 探索性统计检验：Pearson 相关性、Welch t 检验、卡方独立性检验、两比例 Z 检验
- 图表展示：类别分布、数值汇总
- 报告输出：规则版 AI 报告、Markdown 报告下载
- 数据导出：下载当前清洗后的 CSV
- DeepSeek-ready：公开版默认规则报告，本地配置 API Key 后可手动生成 AI 报告

## Safety Design

- 默认不需要 API Key，公开演示版可以完全使用规则版报告
- CSV 数据在浏览器本地解析和处理，不会上传到外部服务
- 真实 API Key 不写入前端代码，不提交到 GitHub
- `.env` 已加入 `.gitignore`
- 大型原始数据目录 `data-sources/` 已加入 `.gitignore`
- DeepSeek API 只应在本地演示或受控部署环境中启用

## Tech Stack

- Next.js
- TypeScript
- PapaParse
- Recharts
- CSS
- DeepSeek API ready

## Local Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Large CSV Test

推荐使用 UCI Bank Marketing 数据集测试上万行分析能力：

- Dataset: https://archive.ics.uci.edu/dataset/222/bank+marketing
- File: `bank-full.csv`
- Rows: about 45,211
- Scenario: marketing conversion analysis

Steps:

1. Download the dataset from UCI.
2. Extract the zip file.
3. Upload `bank-full.csv` in the app.
4. Review data quality, statistical tests, charts, cleaning actions and generated report.

当前版本适合几千到数万行 CSV。几十万行以上建议升级为后端或数据库分析。

## DeepSeek API

The app works without an API key. Public demos can use rule-based reports for free.

If you want to enable DeepSeek report generation locally, create `.env`:

```text
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

Do not commit `.env` to GitHub.

Usage:

1. Run the app locally.
2. Upload a CSV.
3. Click `Generate AI Report`.
4. If `DEEPSEEK_API_KEY` exists, the server-side API route calls DeepSeek.
5. If no key exists, the app safely falls back to the rule-based report.

## Interview Talking Points

- 将数据分析流程产品化：从上传 CSV 到质量诊断、统计检验、图表和报告输出
- 将“计算”和“解释”分离：代码负责真实指标，AI 负责业务表达
- 支持多业务场景：A/B 实验、渠道投放、用户留存、营销转化
- 关注安全：默认无 API Key，公开演示不消耗个人 API 额度
- 支持上万行 CSV 本地分析，适合作品集演示
