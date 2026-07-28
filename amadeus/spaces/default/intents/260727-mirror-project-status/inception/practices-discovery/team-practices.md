# Team Practices — mirror-project-status

上流入力(consumes 全数): code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md

## 判定: 新規 practice なし(変更なし)

practices-discovery:c1 に従い、同日の RE codekb(architecture.md「mirror スタックの canonical 統一・answer consume 機構と plugin walking skeleton」節、code-structure.md の mirror 16ファイル/9,208行地図、technology-stack.md の GraphQL 不在実測+依存 0 行変更、dependencies.md の内部エッジ、code-quality-assessment.md の t300 regression・テスト番号重複発見、business-overview.md — いずれも observed cd937c991)を証跡スキャンとして代用した。affirmed 済み team.md / project.md との差分ギャップとして新規成文が必要な慣行は検出されなかった(後述のギャップ検討1件は requirements への送付事項であり practice の成文対象ではない)。

## 本 intent に適用される既存 practices の対応表

| 領域 | 既存 practice(出典) | 本 intent での適用 |
|---|---|---|
| mirror 同意境界 | project.md Mandated(affirmed 2026-07-24: `auto-mirror: auto` は active Intent の bounded な create/sync/close の standing consent、PR merge/release/publish/deploy への拡張禁止) | Project item 追加+Status 設定は create/sync チェーン内の新操作面 — 同意境界の適用可否を requirements で明文化(下記ギャップ検討) |
| mirror 構造境界 | RE 確定事項: gateway 唯一のプロセス境界、closed schema(config 4面・state codec 3面)、MirrorOperation 3値の5面連動、canonical レンダラ1定義(cid:code-generation:c1-drift-canonical-renderer) | GraphQL argv 族は gateway 内に閉じ、新設定・新 state キーは closed set の全面同時更新で追加。status 診断は書き手 canonical を再利用 |
| 一方向同期 | project.md Mandated(record → Issue 一方向)+ Forbidden(双方向禁止) | Project Status も record → Project の一方向。Project 側の手動変更は drift として診断のみ |
| 失敗継続 | project.md Mandated(GitHub 障害時も workflow 継続+unsynchronized warning+retry state) | pending / safety-blocked / reconcile は既存 MirrorReceiptStatus 語彙(7値)を再利用 |
| 冪等リトライ | project.md Mandated(partial GitHub success と local-state write failure を跨ぐ冪等) | per-Project receipt+audit-batch-before-state-atomicity の既存実装面に載せる |
| 編集正本・配布 | project.md Way of Working / Mandated(正本編集→dist 再生成、7ハーネス — cid:build-and-test:bt-dist-regen-seven-harnesses)+閉じた台帳(MIRROR_TOOL_FILES↔t285) | モジュール追加時は t285 の件数・MIRROR_TOOL_FILES・docs TOPICS を同一変更で同期 |
| テスト | project.md Testing Posture + fs-tests-integration-first + corpus-sweep-for-new-guards + regression-first | gateway=fake runner+envelope 独立 golden(od -c capture 様式)、executor/coordinator=FakeGateway 全数更新、lifecycle=runtime 注入。新ガードは落ちる実証+両側実測 |
| gh 境界 | practices-discovery:gh-scripts-boundary(optional dependency・loud fail・credential 非保持・argument array) | GraphQL 呼び出しも同一境界(runner の argv spawn)に載せる |
| CI / リリース | ci-pipeline:c2(既存 workflow 正本)+ release.yml 一本 | 新規 workflow を作らない。バージョン面に触れない |
| 言語 | CLAUDE.md 言語規約 | コード・コミット英語、record 日本語、docs 日英ペア同期 |

## ギャップ検討の記録

- **auto-mirror 同意境界と Project mutation(requirements へ送付、practice 成文は見送り)**: affirmed Mandated は standing consent の対象を「bounded mirror create, sync, and provenance-verified close」と規定し、Forbidden は「unrelated external actions への拡張」を禁じる。Project item 追加・Status 設定は Intent 自身のライフサイクル投影であり「unrelated external action」(PR merge/release/deploy 類)ではないが、同意文言上は新しい操作面。**「Project 同期は create/sync 操作の bounded な一部」と requirements で明文定義するか、同意対象の別掲が要るか**は仕様の一部としてユーザー可視契約に固定する(先行成文は早期断定のため見送り — plugin-host-delivery の先例と同じ判断)。
- 新規テスト様式・GraphQL 運用の practice 化は実装後の §13 で回収(方式が design で確定してから)。
