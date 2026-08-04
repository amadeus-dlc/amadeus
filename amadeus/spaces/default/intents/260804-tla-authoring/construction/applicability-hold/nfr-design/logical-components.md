# NFR Design: 論理コンポーネント構成 — U2 applicability-hold

上流入力(consumes 全数): 本 unit の解決済み consumes は `business-logic-model.md`(U2 functional-design)。`security-requirements` / `tech-stack-decisions` は nfr-requirements SKIP による expected-absent。

## 層構成(NFR-004/NFR-006 の実装構造)

| 層 | 内容 | 配置(canonical) | テスト層 |
|---|---|---|---|
| 純関数層 | C1 判定表 J1〜J6・buildReceipt の検査ロジック、C9 hold 評価(系列選別 → 鮮度比較 → 判定表 1〜5)、SubjectSeriesKey 導出 | `plugins/formal-model-check/tools/tla-applicability.ts`(新設 library module) | unit(8 組合せ全数 + hold 全分岐、fake 入力) |
| I/O handler 層 | model-map 読取・evidence store 読取(U1 の list/read 消費)・audit shard の HUMAN_TURN 照合読取 | 同 module 内 handler 関数群 | integration(実 FS) |
| CLI dispatch 層 | `tla-authoring.ts` の `applicability` / `hold` サブコマンド | `plugins/formal-model-check/tools/tla-authoring.ts`(U1 と同居の CLI) | in-process seam + integration |
| 宣言結線層(advisory evaluator wrapper) | checkpoint 起動時に U1 `identity extract` で現在対象を確定し `--series` / `--identity` を構成して `hold` を呼ぶ呼び手側スクリプト(U2 FD の確定責務) | plugin 側 tool(engine の宣言読取一般化点から argv 起動される) | integration(宣言 parse 失敗 → hold 側へ倒す落ちる実証込み) |

- 依存方向: CLI / wrapper → handler → 純関数の一方向。U1 の型・CLI 契約への依存は型 import と argv 呼出しのみ(`unit-of-work.md` U2 境界 — 永続化は U1 へ委譲)。
- provenance 照合(HumanApprovalRef)の audit shard 読取は read-only。書込面はゼロ(BR-U2-04)。
- handler は export して in-process 駆動可能にする(`memory/team.md` seam-export-handler-amend)。新設 module は plugin manifest へ登録し U6 guard の閉包検査対象とする(NFR-005)。

## モジュール境界の根拠

- **C1 と C9 を単一 module(tla-applicability.ts)に同居**: 両者は「適用判定と hold」という同一の変更理由(判定表・hold 判定表は FR-001/FR-003/FR-007 の対)を持ち、SubjectSeriesKey・ApplicabilityReceipt 語彙を共有する。U1(evidence 語彙)とは module を分け、語彙所有の境界(`unit-of-work.md`)を module 境界に一致させる。
- **宣言結線層を独立の呼び手に置く**: C9.evaluate は値を受け取るだけで対象選定を所有しない(`business-logic-model.md` §5 の確定)。対象確定(identity extract の実行)は wrapper の責務であり、純関数層に I/O を混入させない。
- engine 側の一般化点(宣言読取・formalCheck 起動)は U2 の code-generation で既存 2 module(`amadeus-plugin-activation.ts` / `amadeus-advisory-choice.ts`)の実測後に最小変更として設計する(ADR-6 改訂の境界 — checkpoint 解除規則は不変)。

## 上流トレーサビリティ

- `construction/applicability-hold/functional-design/business-logic-model.md`(判定表・hold 評価・宣言結線・CLI 面)、`business-rules.md`(BR-U2 群)、`domain-entities.md`(型)
- `inception/requirements-analysis/requirements.md`(NFR-001、NFR-003〜NFR-006)
- `inception/units-generation/unit-of-work.md`(U2 境界)、`inception/application-design/decisions.md` ADR-6 改訂
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:52:32Z)
