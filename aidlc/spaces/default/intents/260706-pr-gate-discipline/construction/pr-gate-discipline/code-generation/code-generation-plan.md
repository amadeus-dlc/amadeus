# Code Generation Plan — pr-gate-discipline

上流入力:
[business-logic-model.md](../functional-design/business-logic-model.md)、
[business-rules.md](../functional-design/business-rules.md)、
[domain-entities.md](../functional-design/domain-entities.md)、
[requirements.md](../../../inception/requirements-analysis/requirements.md)

本 Intent は docs-only refactor（scope = refactor）であり、実装コード・テストコードの変更を含まない。以下はファイル単位の変更計画である。

## 変更対象ファイルと対応要求

| # | 対象ファイル | 種別 | 対応要求 | 内容の要点 |
|---|---|---|---|---|
| 1 | `.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md` | 新規 | FR-3、FR-4、NFR-1 | 英語。business-logic-model.md の 6 節構成（Invariants / CI first / Wait for review bots / Respond to every comment / Escalation / Merge readiness）で Issue #534 の 8 項目を配置。固有名（Devin、CodeRabbit、Bugbot、codecov.yml）は書かず一般化する（FR-4）。ユーザー向け gate 文言・エラーメッセージは含めないため NFR-1 の日本語カーブアウトは発動しない |
| 2 | `aidlc/spaces/default/memory/team.md`「PR 監視」節 | 編集 | FR-1、FR-2.1、FR-4、NFR-2 | 節本文を不変条件 4 行 + 知識文書ポインタへ短縮し、固有名（Devin、CodeRabbit、Bugbot、codecov.yml）を例示 1 行として残す。詳細手順（CI 確認手順、レビューボット待機の具体、偽陽性判断など）は複製せず知識文書へ委譲する |
| 3 | `aidlc/spaces/default/memory/phases/construction.md` | 編集 | FR-1、FR-2.2、NFR-2 | `## Security` の後・`## Corrections` の前に新 H2 節 `## PR Gate` を追加。不変条件 4 行 + 知識文書ポインタ 1 行（分量規則の「4 行相当」を満たす） |
| 4 | `.agents/amadeus/amadeus-common/protocols/stage-protocol.md` | 編集 | FR-2.3、NFR-1、NFR-2 | 「Construction Bolt gates」節末尾（halt-and-ask の question ブロック後、区切り `---` の前）に英語で不変条件 1〜2 行 + 知識文書への参照 1 行を追記。既存の参照表記（`.claude/knowledge/amadeus-shared/...`）に合わせる |
| 5 | `dev-scripts/data/parity-map.json` | 編集 | FR-5.1 | `exceptions[]` の #531 由来エントリ（target に `aidlc-common/protocols/stage-protocol.md` を含み reason が「Issue #504: learnings persist の cid marker...」で始まるもの）の reason へ、本追記の理由（Issue #534、対象＝Construction Bolt gates 節末尾のポインタ追記、上流導入時に解除）を統合する。新規エントリは作らない。`engineFileExceptions`（平坦配列）は変更しない |

## 不適用と確定した項目

- **FR-5.2（skills/ 側正準ソースへの反映）**: business-rules.md の「parity と正準ソースの規則」節で実測により不適用と確定済み。`amadeus-common/` と `knowledge/amadeus-shared/` には skills/ 側の対応ファイルが存在せず、`.agents/amadeus/` 配下が唯一の正。`skills/amadeus/references/aidlc-v2/` は上流スナップショットで同期先ではない。新設する `pr-gate-discipline.md` は上流対応物を持たないため vendored copy も作らない。

## 実行順序

1. 知識文書 `pr-gate-discipline.md` を新設する（他 4 ファイルのポインタ先の実体を先に確定させる）。
2. team.md「PR 監視」節を短縮する。
3. phases/construction.md に `## PR Gate` 節を追加する。
4. stage-protocol.md の Construction Bolt gates 節末尾へ追記する。
5. parity-map.json の既存 exceptions エントリへ理由を統合し、JSON 妥当性を確認する。
6. `npm run parity:check` を実行し、既存 `engineFileExceptions` 宣言により pass することを確認する。

## 検証（business-logic-model.md の検証フロー Q4=A に対応）

- ルール側 3 か所（team.md、phases/construction.md、stage-protocol.md）のポインタ文字列が、実在する `.agents/amadeus/knowledge/amadeus-shared/pr-gate-discipline.md` へ解決することを目視確認する（本ステージでは decision 記録済みの検証方法に従い、build-and-test 側の決定論的確認は別ステージの担当。本ステージは生成物自体の整合を確認する）。
- `python3 -m json.tool` で parity-map.json の妥当性を確認する。
- `npm run parity:check` の pass を確認する。
