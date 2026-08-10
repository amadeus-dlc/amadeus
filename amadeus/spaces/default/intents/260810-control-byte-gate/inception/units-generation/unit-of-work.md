# Unit of Work — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(FR-CBG-1〜16・NFR-1〜4 を Unit の受け入れ条件へ全数割付)、components.md(Unit が内包する5コンポーネント)、component-methods.md(公開署名 = Unit の実装契約)、services.md(実行単位2つ = 本 Unit の配送物)、component-dependency.md(Unit 内依存の閉包性 — 外部 Unit への依存なし)、decisions.md(ADR-1〜3 = Unit の設計拘束)

## U1: control-byte-gate(kind: service)

- **境界**: `tests/lib/control-byte.ts`(述語)+ `tests/control-byte-gate.ts`(CLI)+ `.github/workflows/ci.yml`(独立ジョブ追加)+ unit/integration テスト + 落ちる実証・sweep の実測記録。
- **内容**: FR-CBG-1〜16 の全実装(requirements.md)。設計拘束は decisions.md ADR-1(常時実行独立ジョブ・detect-ci-changes 無改修)/ ADR-2(in-script allowlist)/ ADR-3(検出集合 C0−{TAB,LF,CR}+DEL)。FR 割付の全数表:

| 実装面 | 担う FR/NFR |
|---|---|
| 述語 `tests/lib/control-byte.ts` | FR-CBG-3, 4, 11、NFR-1 |
| CLI `tests/control-byte-gate.ts` | FR-CBG-1, 2, 5, 6, 13、NFR-2, 3, 4 |
| CI ジョブ(ci.yml) | FR-CBG-7, 8, 14 |
| unit/integration テスト | FR-CBG-12, 16 |
| 実測記録(落ちる実証・sweep・実行時間) | FR-CBG-9, 10, 14, 15 |
- **受け入れ**: 各 FR の受け入れ基準(requirements.md)+ NFR-1〜4。統合検証は component-methods.md の GateResult 契約と services.md の exit code 契約。
- **独立実装可能性**: 外部 Unit 依存なし(単一 Unit)。既存コードへの変更は ci.yml へのジョブ追加のみで、他 intent との交差面は ci.yml 1 ファイル(component-dependency.md — 既存コンポーネントは読み取り参照のみ)。
- **Deployment model**: standalone(repo-only の単発 CLI + CI ジョブ — services.md の実行単位2つ。配布物・dist 投影なし)
- **相対複雑度**: S(単一ファイル群・外部統合は git spawn と CI job 定義のみ。LOC 見積りは下記)

## 規模の正当化(数値)

- `tests/lib/control-byte.ts`: 約 40-70 行(述語+集合コメント)
- `tests/control-byte-gate.ts`: 約 120-180 行(列挙・読取・allowlist・診断・exit)
- `ci.yml` ジョブ追加: 約 15-25 行
- テスト(unit + integration): 約 150-250 行
- 合計見積り: **約 325-525 行**(再利用: ci.yml のジョブ様式・tests/ ゲート様式・isUtf8/CONTROL_CHARS のバイト集合定義。新規機構はゲート本体のみ — components.md の棚卸しどおり)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T09:59:03Z
- **Iteration:** 1
- **Scope decision:** none

3成果物+questions は内的整合・上流参照とも成立。single-unit 裁定は cid:units-generation:c1(a) に接地した実質根拠あり。edge block は nested name/kind/depends_on 形で kind: service・acyclic。規模正当化は数値 LOC で adapter 先行着地なし。FOLLOW-UP 2件(deployment model / S-M-L-XL 欠落、per-FR 割付表)は conductor が是正済み、NIT 1件は単一 Unit のため実質違反なし。

### Findings

- FOLLOW-UP | unit-of-work.md:U1 — stage 契約が named する Deployment model と相対複雑度(S/M/L/XL)が欠落(是正済み: standalone / S を追記)。
- FOLLOW-UP | unit-of-work.md:内容 — FR 割付が blanket 主張で per-FR 検証可能性が弱い(是正済み: 実装面×FR/NFR の全数表を追記)。
- NIT | unit-of-work-dependency.md:依存の説明 — Unit 内実装順の言及が cross-unit 順序ガードの文言に近接(単一 Unit のため実質違反なし・所有は delivery-planning へ明示委譲済み)。
