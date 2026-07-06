# Business Rules — pr-gate-discipline

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 不変条件（ルール側に置く最小セット、FR-1）

1. PR にコメントが付いている場合、返答・解決なしの放置やマージを許容しない（核。Maintainer 確定の文言意図）。
2. PR 作成後は監視を行い、PR gate 規律（知識文書）に従う。
3. merge は人間が行う。
4. 検証設定（カバレッジなど）を緩めて pass させない。

ルール側 3 か所（team.md、phases/construction.md、stage-protocol.md）の不変条件は、この 4 項目と意味が一致していなければならない。表現は配置先の言語・様式に合わせてよいが、項目の追加・削除はしない。

## 分量規則（NFR-2）

| 配置先 | 上限 |
|---|---|
| team.md「PR 監視」節 | 不変条件 + ポインタで 3〜4 行 + 固有名の例示 |
| phases/construction.md「PR Gate」節 | 不変条件 4 行相当 |
| stage-protocol.md（Construction Bolt gates 節末尾） | 不変条件 1〜2 行 + 知識文書への参照 1 行 |

詳細手順はルール側へ複製しない。手順の正は知識文書 1 か所とする。

## 言語規則（NFR-1）

- 知識文書（`pr-gate-discipline.md`）は英語で書く。gate 文言・エラーメッセージを含めない設計のためカーブアウトは発動しない。
- team.md と phases/construction.md の追記は日本語。
- stage-protocol.md の追記は英語（同文書の既存言語に合わせる）。

## parity と正準ソースの規則（FR-5）

parity-map.json の実測（reviewer iteration 1 の指摘を受けた裏取り）に基づき、requirements.md FR-5.1 / FR-5.2 の記載を次のとおり精密化する。

- parity-map.json の `engineFileExceptions` は path 文字列の平坦配列であり、reason フィールドを持たない。`aidlc-common/protocols/stage-protocol.md` は宣言済みのため変更不要。
- 理由の統合先は `exceptions[]`（`{target, reason}` 型、15 件）の #531 由来エントリ（target に `aidlc-common/protocols/stage-protocol.md` を含み、reason が「Issue #504: learnings persist の cid marker...」で始まるもの）である。この既存エントリの target と reason へ、本 Intent の追記対象と理由（「PR gate 不変条件の最小ポインタ」、Issue #534）を統合する。新規エントリを作らない。
- `skills/` 側正準ソースへの同一反映（requirements.md FR-5.2）は**不適用**とする。実測により、`amadeus-common/` と `knowledge/amadeus-shared/` には skills/ 側の対応ファイルが存在しない（`.agents/amadeus/` 配下が唯一の正）。`skills/amadeus/references/aidlc-v2/` は上流のスナップショット（vendored copy）であり、ローカル編集の同期先ではない。新設する `pr-gate-discipline.md` は上流対応物を持たないため、vendored copy も作らない。
- 【一時停止条件（leader 指示 2026-07-06T01:41:42Z）】→ 解除済み（01:49:20Z、followup PR #542 merge）。code-generation 着手前に origin/main へ再追従し、post-#542 の parity-map 実形（108 mappings、engineFileExceptions 33 件）で上記エントリを再確認する。
- 知識文書の新規追加は現行 parity 実装では fail しない見込みだが、出自（Issue #534）を PR 説明に記載して追跡可能にする（FR-5.3）。

## 固有名の切り分け規則（FR-4、Q4 ピア協議 = A）

- 知識文書には固有名（Devin、CodeRabbit、Bugbot、codecov.yml）を書かない。一般化した表現（応答が遅いボット、カバレッジ検証設定）を使う。
- 固有名は team.md 側の短縮節に例として残す。

## 上流提案の扱い

不変条件 + ポインタは上流（awslabs/aidlc-workflows）にも価値がある汎用規律であり、上流提案候補である（decision 記録済み）。提案するかは人間判断であり、本 Intent では実施しない。
