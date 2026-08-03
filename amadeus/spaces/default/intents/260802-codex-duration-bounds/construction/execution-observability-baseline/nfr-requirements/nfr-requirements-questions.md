# NFR Requirements — 質問票（0問様式、unit: execution-observability-baseline）

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 質問不要判定

- 判定: 質問0問。`requirements.md` の NFR-04 と FR-08.3 が、baseline取得前の根拠のない絶対時間閾値を明示的に禁止している。
- 定量化方法: 既存 `technology-stack.md` に記録済みのbenchmark protocol（warmup 3回、測定20回、median/p95）を再利用し、Unit 1では比較可能なcontrol baseline、イベント増幅、同期I/O、完全性を固定する。
- 安全性・信頼性・配布境界: `business-logic-model.md` と `business-rules.md` のStartPermit、必須projection barrier、OTel best-effort、privacy、7 package／5 self-install契約から一意に導出できる。
- 実行裁定: `amadeus-state.md` の Construction Autonomy Mode は `autonomous`。未解決の事業判断や規制要件は検出されていない。

## 曖昧性分析

- 「速い」「高可用」のような曖昧な回答は存在しない。
- 絶対時間budgetは Unit 1のbaseline manifest生成後に同じBolt内で記録する後続裁定であり、事前値を置かないことが正しい境界である。
- 後続UnitのStop／retry、question／review、Unit poolのdefaultとhard capは各UnitのNFR成果物で確定し、本Unitへ先行実装しない。
