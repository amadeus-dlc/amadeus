# NFR Design: 論理コンポーネント構成 — U4 registration-committer

上流入力(consumes 全数): 本 unit の解決済み consumes は `business-logic-model.md`(U4 functional-design)。`security-requirements` / `tech-stack-decisions` は nfr-requirements SKIP による expected-absent。

## 層構成(NFR-004/NFR-006 の実装構造)

| 層 | 内容 | 配置(canonical) | テスト層 |
|---|---|---|---|
| 純関数層 | 6 前提の全数検査(candidate → 承認済み型の parse)、bundle 整合検査、draft 込み map 全体の検証ロジック、snapshot bytes 比較 | `plugins/formal-model-check/tools/tla-registration.ts`(新設 library module) | unit(同時複数失敗 fixture 込み全分岐) |
| I/O handler 層 | model-map 読取・再読込・temp 書込・atomic rename、audit shard の provenance 再照合読取、U1 verify の呼出し | 同 module 内 handler 関数群 | integration(実 FS。競合 fixture は注入 seam で決定的再現 — BR-U4-16) |
| CLI dispatch 層 | `tla-authoring.ts` の `commit` サブコマンド(U1〜U3 と同居) | `plugins/formal-model-check/tools/tla-authoring.ts` | in-process seam + integration |
| validator 拡張 | `MODEL_KEY_SETS` への optional `evidenceBundle` 集合追加(既存 4 集合は不変) | `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts`(既存 module への最小変更) | 既存 validator テスト + 拡張分の unit(既存 map 受理不変の回帰 — BR-U4-17) |

- 依存方向: CLI → handler → 純関数、handler → U1(verify)/ 既存 validator(一方向)。U4 は evidence store へ書かず、model-map の書き手は U4 単一(BR-U4-04 を module 境界で保存)。
- handler は export して in-process 駆動可能にする(`memory/team.md` seam-export-handler-amend)。新設 module は plugin manifest へ登録し U6 guard の閉包検査対象(NFR-005)。

## モジュール境界の根拠

- **tla-registration.ts を独立 module に**: 登録は「可視化点の所有」という単独の変更理由を持ち、U1(evidence 語彙)・U2(判定/hold)・U3(referee)のどれとも変更理由が異なる。`unit-of-work.md` の unit 境界 = module 境界。
- **validator 拡張を既存 module 内の最小変更に留める**: 検証責務の所有は既存 validator のまま動かさない(`components.md` §C6 境界「既存 model-map v2 schema・completeness sensor の検証責務は変更しない」)。拡張は key 集合データの追加であり、`exactObject` の検査意味論に触れない(Q1 裁定の変更面の閉じ込め)。
- **provenance 再照合を handler 層に置く**: audit shard 読取は I/O であり、照合述語(timestamp + SHA-256 一致)は純関数層に置いて fake shard bytes で unit test する — 偽装負例 fixture(BR-U4-15)を in-process で決定的に検証できる。

## 上流トレーサビリティ

- `construction/registration-committer/functional-design/business-logic-model.md`(commit 手順・validator 拡張点)、`business-rules.md`(BR-U4 群)、`domain-entities.md`(型)
- `inception/requirements-analysis/requirements.md`(NFR-001、NFR-004〜NFR-006)
- `inception/units-generation/unit-of-work.md`(U4 境界・CLI 契約)、`inception/application-design/decisions.md` ADR-3
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:52:32Z)
