# Initiative Brief — 260722-tla-plugin

上流入力(consumes 全数): intent-statement(読了)、scope-document(読了)、intent-backlog(読了)、feasibility-assessment(読了)、constraint-register(読了)。competitive-analysis / team-assessment / wireframes は該当ステージ SKIP のため不在(expected — 各節に N/A 根拠を明記、cid:approval-handoff:c4)

## Intent と問題(Problem)

PBT はオラクル相殺により並行プロトコルの欠陥を構造的に見逃す(実測: TLA 7/7 vs PBT 3/7)。実験で実証済みの TLA+ 検証能力が実験資材に閉じており、二層検証態勢(既決)の「spec 変更時に形式検証を追加」が実行不能。本intentは検証能力を常設化する: formal-model-check ステージ(plugins/ バンドル・opt-in)、FormalElection の .tla 外部化、run-model-check.ts、ci.yml 統合(Linux + Docker digest固定)、完備性 sensor。

## 市場検証サマリ(Market Validation)

N/A — market-research は scope `amadeus`(セルフホストのフレームワーク開発)で SKIP。代替の内部証拠: 260720-formal-verif-experiment の適格性実験(7欠陥コーパスでの検出率実測)と、その結果に基づくユーザー裁定(二層検証態勢、2026-07-22)が投資判断の根拠を与える。外部市場の検証は本intentの性質上不要。

## 実現性とリスク(Feasibility & Risk Highlights)

- 判定 **GO(条件なし)** — 全構成要素は実測済み既存資産の再配置・一般化
- Open リスク4件(R1 fail-closed劣化 / R2 イメージ供給元 / R3 plugin E2E / R4 モデル同一性)はすべて緩和策付きで、Q1 裁定によりユーザー受容済み。R3/R4 は walking skeleton で最初に実証
- 外部前提は「既成 TLC Docker イメージの実在」のみ(A1、設計段で実測確定)

## スコープ境界(Scope Boundary)

- In: C1〜C5(全 Must)= plugin ステージ / .tla 外部化 / run-model-check.ts / CI 統合+旧 workflow 退役 / 完備性 sensor
- Out(Won't): 実験資材退役、新規モデル、Linux ネイティブ sandbox provider、一律義務化、リリース面
- 順序: risk-first(walking skeleton = P1+P2)

## コンセプト可視化(Concept Visuals)

N/A — rough-mockups は SKIP(UI を持たない CLI/CI/プラグイン基盤)。代替: intent-backlog の価値ストリーム(spec 変更 → sensor 検出 → モデル更新 → 完全探索 → CI 実証 → 機械保証付きマージ)が利用者体験の輪郭を与える。出力様式の具体化は Inception の設計ステージで既習様式(既存 sensor / CLI ツールの出力契約)に揃える。

## 体制計画(Team Plan)

N/A — team-formation は SKIP(ソロモード運用)。確約するリソースは Inception の分析と人間ゲートまでに限定し、Construction の staffing・スケジュールは Unit と依存が確定した後の Delivery Planning で承認する(cid:approval-handoff:c3 — 未確定の named mob を捏造しない)。

## Go/No-Go 推奨

**GO** — 全 ideation 裁定(intent 5問・feasibility 5問・scope 3問・リスク受容)がユーザー本人により確定済み。次フェーズ: Inception(reverse-engineering から)。
