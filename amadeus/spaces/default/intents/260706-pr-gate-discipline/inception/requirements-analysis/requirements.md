# Requirements — 260706-pr-gate-discipline（Issue #534）

## Intent 分析

PR 監視の品質規律（レビューボット待機、全コメント対応、偽陽性判断、エスカレーションなど）は、現在 Maintainer 個人の `~/.claude/CLAUDE.md` に依存している。Amadeus 側にあるのは team.md「PR 監視」節の骨格だけであり、配布先の利用者環境ではこの規律が欠ける。

本 Intent は、この規律を「不変条件はルール、手順と判断基準は知識、ルールには知識へのポインタ」というハイブリッド構成（Maintainer 確定、2026-07-06）で Amadeus へ移設し、個人 CLAUDE.md 依存を解消する。

根拠となる注意資源の原則: ルール（rules_in_context）は全ステージへ常時注入されるため、PR 作成後にしか使わない詳細手順を置くと注意が薄まる（`.agents/rules/agent-instruction-rules.md`）。知識は必要な場面で参照される（前例: `audit-format.md`）。

コードベース文脈（codekb 参照）: 開発は GitHub Issue 起点、PR 単位は phase / Bolt、merge は人間が行う運用モデルである（`aidlc/spaces/default/codekb/amadeus/business-overview.md`）。配布は installer が `.agents/amadeus/` の 7 dirs と amadeus* skills を丸ごとコピーする（`codekb/amadeus/architecture.md`、`codekb/amadeus/code-structure.md` の `scripts/` 行）。したがって `knowledge/amadeus-shared/` と `amadeus-common/protocols/` は配布に乗り、workspace memory（`aidlc/spaces/*/memory/`）は乗らない。

## 機能要求

### FR-1: 不変条件の最小セットをルール側に置く

不変条件の核（Maintainer 確定の文言意図）を含む最小セット（3〜4 行）をルール側に置く。

1. **PR にコメントが付いている場合、返答・解決なしの放置やマージを許容しない**（核）。
2. PR 作成後は監視を行い、PR gate 規律（知識文書）に従う。
3. merge は人間が行う。
4. 検証設定（カバレッジなど）を緩めて pass させない。

### FR-2: ルール側の配置（Q1 = B、ピア協議 5/5 一致）

- FR-2.1: team.md「PR 監視」節を不変条件 + ポインタへ短縮する（詳細手順は知識文書へ移す）。
- FR-2.2: `aidlc/spaces/default/memory/phases/construction.md` へ不変条件を追記する。
- FR-2.3: 配布側 `amadeus-common/protocols/stage-protocol.md` へ最小追記する（不変条件 1〜2 行 + 知識文書への参照 1 行。手順の重複を持ち込まない）。

### FR-3: 知識文書の新設（Q2 = A）

`.agents/amadeus/knowledge/amadeus-shared/` へ PR gate 規律の知識文書を新設する。内容は Issue #534 の確定一覧に従う。

1. CI エラーを review comment より先に解消する手順（conflict 解消を含む）。
2. レビューボットの結果を必ず待つ（反応中の判定方法、長い sleep で監視間隔を作らない理由 = 投稿の取りこぼし）。
3. 全コメント（トップレベル・インライン）への対処: 反映したら対応内容を返信、非対応なら理由を返信。
4. 偽陽性の判断手順（鵜呑みにせず PR の主旨・実コードと突き合わせる）。
5. 目的と異なるが有効な指摘の Issue 化（スコープアウト。起案は人間と leader）。
6. 同じ指摘が繰り返される場合の中断と人間エスカレーション。
7. カバレッジエラーへの対処（検証設定の変更による回避の禁止）。
8. merge 準備の完了条件と、merge は人間が行うことの再掲。

### FR-4: チーム固有分の切り分け（Q4 = A）

知識本体は一般化して書く（例: 「遅いボットも必ず待つ」「カバレッジ検証設定の変更による回避の禁止」）。固有名（Devin、CodeRabbit、Bugbot、codecov.yml など）は team.md 側の短縮節に例として残す。

### FR-5: parity と正準ソースの整合

- FR-5.1: stage-protocol.md の追記は、`dev-scripts/data/parity-map.json` の `engineFileExceptions` にある既存エントリ（#531 で追加済み）の reason へ理由（「PR gate 不変条件の最小ポインタ」、対象行、Issue #534）を統合する。新規例外エントリを作らない。
- FR-5.2: `skills/` 側の正準ソースへ同一内容を反映する（エンジンファイル修正時の既定。`codekb/amadeus/code-structure.md` の parity 行を参照）。
- FR-5.3: `knowledge/amadeus-shared/` への新規ファイルは、現行 parity 実装（baseline 起点の欠落・hash 不一致検査）では fail しない見込み（engineer1 実測）だが、出自を PR 説明で追跡可能にする。

## 非機能要求

- NFR-1（言語）: 知識文書は英語で書く（amadeus-shared の既存慣行。Q3 = A）。ユーザー向け gate 文言・エラーメッセージを含める場合は、その部分だけ日本語を維持する（言語方針のカーブアウト）。ルール側（team.md、phases/construction.md）は日本語を維持する。
- NFR-2（注意資源）: ルール側の追記は最小に抑える（team.md 側 3〜4 行、stage-protocol.md 側 1〜2 行 + 参照 1 行、phases/construction.md 側も FR-1 の不変条件 4 行相当に収める）。詳細手順の重複を持ち込まない。
- NFR-3（検証）: validator（Intent 指定込み）と `npm run test:all` が pass する。

## 制約

- scope は refactor（docs 系。ルール + 知識文書の新設・編集）。実装コード・テストコードの変更を含まない。ただし parity-map.json の reason 統合は本変更に不可分の宣言更新として含む。
- PR merge は人間が行う。
- gate 承認は auto 委任中（人間の包括委任 → leader 内容確認 → engineer の経路）。
- PR #536（言語方針）は merge 済みのため、docs/amadeus を参照する場合はリンク規約（en 正本 + ja 併置）に追従する。

## 前提

- installer の配布対象は `.agents/amadeus/` 7 dirs + amadeus* skills であり、`knowledge/amadeus-shared/` と `amadeus-common/protocols/` は配布に乗る（engineer2 = #451 実装者の確認）。
- engineer1 の #428（PR #539）は stage-protocol.md を変更せず、amadeus-shared への変更は audit-format.md の編集のみ（非接触の確認済み、agmsg 2026-07-06T01:06:56Z）。
- engineer5 の #535（README 見直し）とは非接触（本 Intent は README を変更しない）。

## スコープ外

- eslint などの新規リンター導入と、規律のリンター強制（#530 = 規範の三形態のうち「リンター = 強制」は別 Intent）。
- `~/.claude/CLAUDE.md` からの重複情報の削除（Maintainer 自身が行う。受け入れ条件の観察検証は次の PR サイクル）。
- 上流（awslabs/aidlc-workflows）への提案（提案候補である旨は decision に記録済み。提案するかは人間判断）。
- 利用者ガイド（#533）の troubleshooting/PR 章の執筆（本知識文書はその素材になるが、執筆自体は #533 の範囲）。

## 未解決事項

- 知識文書のファイル名（`pr-gate-discipline.md` を仮案とし、functional-design で amadeus-shared の既存命名（`audit-format.md`、`rules-reading.md` など）に合わせて確定する）。
- team.md「PR 監視」節の短縮後の具体文面（construction の code-generation で確定する）。
- 受け入れ条件「ルールから知識へのポインタが機能している」の検証方法（相対パスが実在ファイルへ解決することの機械的確認か、目視レビューで足りるか）。functional-design で確定する。

## 受け入れ条件（Issue #534 から転記）

| 受け入れ条件 | 対応要求 |
|---|---|
| 不変条件がルール側に、監視手順・判断基準が知識文書に存在し、ルールから知識へのポインタが機能している | FR-1、FR-2、FR-3 |
| Maintainer が `~/.claude/CLAUDE.md` から重複情報を削除しても、engineer の PR 監視挙動が維持される（次の PR サイクルで観察検証） | FR-2（workspace 層）、FR-4 |
| 言語は #509 の方針に従う（英語必須層に置く場合は英語 + 生成物への日本語維持の整理を含む） | NFR-1 |
| validator / test:all が pass する | NFR-3、FR-5 |
