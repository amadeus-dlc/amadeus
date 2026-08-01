# 260731-formal-verif-value-chain 差分スキャン記録

## 実行メタデータ

- Date: `2026-07-31T09:06:44Z`
- Repository: `amadeus-dlc/amadeus`
- Base commit: `6e7a9d701`
- Observed commit: `da51af37533c31a9c3f4ed46bf71b5b15988b0d6`
- 作業断面: HEAD `16486d3c715eec6566a18ba03898b43e5bc3dcdc`（observed + 本 intent の record コミット1本。ソース面は observed と同一）
- Distance: `12 commits`（base→HEAD）／ observed→HEAD は `1 commit`
- Ancestry: `6e7a9d701` は HEAD の祖先（`git merge-base --is-ancestor 6e7a9d701 HEAD` exit 0）。`da51af375` も同様に exit 0
- Scope: `self-feature` / Brownfield / single repository
- Scan mode: Developer static live-code scan を上流入力にした differential refresh。Architect の引用再確認あり（`cid:reverse-engineering:c3` の Developer→Architect 直列）。テスト未実行、TLC 未実行
- Focus: [#1738](https://github.com/amadeus-dlc/amadeus/issues/1738)（価値チェーン貫通）、[#1829](https://github.com/amadeus-dlc/amadeus/issues/1829)（配布自立化）、[#1510](https://github.com/amadeus-dlc/amadeus/issues/1510)（model-map 正規更新経路）
- Delivery: 1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

## Base 選定根拠

`cid:reverse-engineering:rescan-base-ancestry`（日付最新ではなく HEAD の祖先である observed のうち距離最小を選ぶ）に従い、祖先性を機械判定して距離最小を採った。

| 記録済み observed | 出自 intent | `git merge-base --is-ancestor <observed> HEAD` | 距離 |
| --- | --- | --- | --- |
| `6e7a9d701` | 260731-open-bug-batch-4 | **exit 0（祖先）** | **12** ← 採用 |
| `3f73823b1` | 260730-open-bug-batch-3 | exit 0（祖先） | 25 |

merge-base 復元は不要だった。前 intent が `cid:reverse-engineering:c2-observed-mainline-commit`（observed にはローカル merge コミットでなく `origin/main` 系譜のコミットを記録する）を実践した効果が2世代連続で継続している。

本 intent の observed も同 cid に従い `origin/main` head の `da51af375`（`record: sync intent 260731-open-bug-batch-4 (4 bug fixes) with elections and §13 learning (#1834)`）を記録する。作業断面 HEAD `16486d3c` は本 intent の record コミット（`record: birth intent 260731-formal-verif-value-chain and complete intent-capture`）1本だけが乗ったローカルコミットであり、**ソースファイルは observed と完全に同一**のため、本 RE が新規に書いた file:line は `da51af375` でも同一に解決する。

既存成果物の履歴節に含まれる file:line は当時の observed 断面に固定されているため、参照する場合は `cid:requirements-analysis:historical-section-cite-check-at-observed` に従い当該 observed で照合する（HEAD 照合は偽陽性を生む）。

## 区間の変化（`6e7a9d701..HEAD`、12 コミット）

`git diff --shortstat` = `126 files changed, 4214 insertions(+), 102 deletions(-)`。面別内訳（`git diff --numstat` の機械集計、`cid:requirements-analysis:numbers-from-command-output-only`）:

| 面 | files | + | − |
| --- | --- | --- | --- |
| `amadeus/` record | 89 | 3221 | 9 |
| `dist/` | 14 | 133 | 14 |
| self-install（7 ハーネス dot-dir） | 10 | 95 | 10 |
| `metrics/` | 4 | 215 | 2 |
| **ソース面** | **9** | **550** | **67** |
| 小計（`amadeus/` 除く） | 37 | 993 | 93 |

主要変化:

- **mirror presentation**（`9008141df`）— completion 境界後の Issue Status を `Completed` で描画。`amadeus-mirror-presentation.ts` / `amadeus-mirror-lifecycle.ts` + dist 同期、新規 `t-mirror-completion-status-view.integration.test.ts` と `t281` 拡張
- **テスト堅牢化3件** — `20230b90d`（t259 単一プロセス交互計測）、`7ec3e0eae`（t224 spawn 枯渇リトライ）、`1a3087508`（team-up supervisor reap）
- metrics スナップショット3件、`coverage-patch-allowlist` の微修正、`v0.1.7` リリース

**対象実装面への変更はゼロ。** `git diff --name-only 6e7a9d701..HEAD | grep "formal-verif\|plugins/\|model-map\|ci.yml"` のヒットは6件だが、全件が本 intent 自身の record ファイル（`amadeus/spaces/default/intents/260731-formal-verif-value-chain/` 配下の state / audit / intent-capture 成果物）であり、`scripts/formal-verif/` / `plugins/` / `specs/tla/` / `.github/workflows/ci.yml` はいずれも無変更。したがって本 RE が確定した機構・依存・台帳の前提は、区間内の変更によって揺らいでいない。

## Developer Code Scan の合成結果

Developer が11節の findings を提出（54 ファイルの推移閉包計算、plugin manifest スキーマ実測、advisory 発火点、model-map 詰み構造、mirror 有限ドメイン、CI 配線、テスト・台帳面）。Architect はこれを一次入力として受け、確約級引用を独立再実測したうえで9成果物へ差分反映した。

## Architect Synthesis

### 3 Issue の機構帰属

| Issue | 所在層 | 欠陥の型 | 修正の性質 |
| --- | --- | --- | --- |
| #1829 | 配布層（compose / projection / manifest） | 未完の機能 — 宣言駆動と ディスク駆動の非対称 | manifest スキーマ拡張（型 + parser + `composeWriteSet` + `ownedPaths` の4点連動） |
| #1738 | engine 層（advisory）+ 配布層（多ハーネス compose） | 貫通点が細い（1 stage / 1 行 / 1 ハーネス / 1 モデル） | 発火点の再設計 + 新規モデル題材の追加 |
| #1510 | 整合層（sensor / loader） | write⇔check 非対称による詰み | 判定条件の対称化（依存追加不要） |

**共有ソースファイルはゼロ** — 3件は独立 Bolt として並行実装できる。交差するのは `tests/.complexity-baseline.json` と `tests/.coverage-patch-allowlist.json` の2台帳のみで、#1829 の移設が行シフトを起こす。

### 依存と順序

- #1510 は単独で利用者価値を持つ（詰みが解ける）。他2件と交差せず、最も先行させやすい
- #1738 の advisory 前倒しは `amadeus-orchestrate.ts:1296-1297` の「single guarded call site … so no latch is needed」という前提を破りうるため、ラッチ新設の要否を要件段で裁定する
- #1829 は群 B（CI ラッパ 7 本）の帰属を決めない限り出荷可能単位にならない（`ci.yml:584` / `:600` が消費）。台帳2面を触るため、着地順序の調整対象はこの Bolt

### 要件段へ持ち越す裁定事項

1. **群 B（CI ラッパ 7 本）・群 C（診断 1 本）の帰属先** — plugin 配下か repo 残置か。字義どおり「群 A の 16 本だけ抜き出し + 残余削除」は CI を壊す
2. **群 D（到達不能 30 本）と関連テストの削除範囲** — 本番からは死んでいるが `.test.ts` 72 本が参照し、`complexity-baseline` 22 件中 20 件がここを守る
3. **manifest スキーマ拡張の形** — `tools` フィールドの表現、および `tests/.coverage-patch-allowlist.json:35-36` が明記する「trusted path は `plugins/<plugin>/stages/` 始まり限定」との整合
4. **群 A の唯一の外部依存の扱い** — `canonical.ts:1-5` が re-export する `amadeus-formal-verif-model-map.ts` を (a) plugin へ複製 / (b) core 依存として許容 / (c) plugin へ移して core を逆依存させる。(c) は依存方向を逆転させるため要注意
5. **advisory 発火点の再設計** — 単一呼出しを保って位置だけ動かすか、複数化してラッチを新設するか（後者は落ちる実証が必須）
6. **多ハーネス compose の方式** — 7 回別々に呼ぶか multi-host を新設するか（`.amadeus-plugin-src` の実在は `.claude/` のみ）
7. **mirror モデルの有限化定数** — `MAX_RECEIPTS = 1000` をどこまで落とすか。落としすぎると receipt 履歴に依存する再試行冪等性の不変量が消える
8. **model-map entries の正準 impl 集合** — mirror 骨格（types 608 + reducer 823）に絞るか、遷移を駆動する coordinator / lifecycle まで含めるか

### 実装段への申し送り

- `scripts/formal-verif/` のパス変更は `tests/.complexity-baseline.json`（22 件）と `tests/.coverage-patch-allowlist.json`（複数エントリ）を同時に動かす。行ピンは全件を機械 remap し、remap 後に reason 記述と現行行内容の直読照合を併用する（`cid:code-generation:c1-allowlist-mechanical-remap` / `cid:code-generation:allowlist-line-pin-stale`）
- `plugins/` 正本を触ると `dist/plugins/formal-model-check/` の 8 変種 38 ファイルと self-install 面が同時に動く。`bun run dist:check` / `bun run promote:self:check` を検証集合に必ず含める
- stage 本文の `scripts/formal-verif/run-model-check.ts` 参照は4面に複製されている（正本 `:12` / `:41`、`.claude/plugins/…` 同2箇所、`.claude/.amadeus-plugin-src/…` 同2箇所、`.claude/tools/data/stage-graph.json:2436`）。パス変更時は4面すべてを grep で棚卸しする（`cid:code-generation:fixture-propagation-grep`）
- #1510 の修正は `.claude/sensors/amadeus-model-completeness.md:39-41` が MODEL_UNCHANGED 拒否を仕様として記述しているため、文書改訂を同一変更に含める（`cid:code-generation:same-root-inventory`）
- 新規ガード・判定条件の変更は「落ちる実証」を実行時に消費される行へ注入して行う（`cid:code-generation:inject-runtime-consumed-lines` / `cid:code-generation:injection-surface-verify`）

## 既存 open PR の棚卸し

`cid:reverse-engineering:c1-preexisting-pr-inventory` に従い3 Issue について既存 PR の有無を確認したが、本 RE 時点で対象 Issue に紐づく open PR は確認できていない（Bolt 編成は新規実装型を前提とする）。要件段・delivery-planning 段で再確認する。

## 引用再確認の結果（Architect が HEAD `16486d3c` で独立再実測）

Developer findings の確約級引用を重要度順に23箇所検証した。**所在・機序・結論は全件一致**、相違は数え方に起因する4点のみ。

| # | 検証対象 | Developer 報告 | Architect 実測 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | `scripts/formal-verif/*.ts` 総数 | 54 | 54 | 一致 |
| 2 | 群 A の唯一の外部依存 | `canonical.ts:5` → `amadeus-formal-verif-model-map.ts` | `:1-5` の re-export ブロックで確認 | 一致 |
| 3 | 3+1 分類の検算 | 16+7+1+30 = 54 | 一致 | 一致 |
| 4 | advisory スロット定数 | `amadeus-orchestrate.ts:1293` | verbatim 一致 | 一致 |
| 5 | advisory ガード / 呼出 | `:1306` / `:1307` / `:1308` | verbatim 一致 | 一致 |
| 6 | stderr 単線コメント | `:1299-1300` | verbatim 一致 | 一致 |
| 7 | ラッチ不要の前提 | `:1296-1297` | verbatim 一致 | 一致 |
| 8 | advisory 文面2種 | `amadeus-plugin-activation.ts:209` / `:211` | verbatim 一致 | 一致 |
| 9 | 判定関数 / ファイル規模 | `:272` / 295 行 | 一致 | 一致 |
| 10 | 3値判定（`current` は沈黙） | `:57` | `:56-57` のコメント2行に跨る | 一致（精密化） |
| 11 | manifest に `tools` 無し | 型 `:105-109` / parser `:330-334` | 型は `:105-110`、parser `:330-334`。3フィールドで閉じる | 一致（型の行幅を精密化） |
| 12 | `plugin.json` 実体 | stages 1 / seams [] / fragments [] | 一致 | 一致 |
| 13 | `composeWriteSet` | `:1021-1037`、`stageCopies` + `sharedWrites` のみ | `:1021` 定義、内容一致 | 一致 |
| 14 | compose / plugin CLI 規模 | 1488 行 / 884 行 | 一致 | 一致 |
| 15 | host 従属（staging） | `.amadeus-plugin-src` は `.claude/` のみ | `find` で `./.claude/.amadeus-plugin-src` のみ | 一致 |
| 16 | MODEL_UNCHANGED 拒否 | `:650-659`、model/cfg identity のみ判定 | `:657` に `code: "MODEL_UNCHANGED"`、条件は model/cfg identity 比較のみ | 一致 |
| 17 | SOURCE_DRIFT | `tla-model-loader-internal.ts:232` | verbatim 一致 | 一致 |
| 18 | センサー `matches` | `.claude/sensors/amadeus-model-completeness.md:8` | verbatim 一致 | 一致 |
| 19 | model-map 実体 | schemaVersion 1 / entries 5 | 一致 | 一致 |
| 20 | mirror 群の規模 | 25 ファイル / 12,174 行 | 一致 | 一致 |
| 21 | mirror 有限ドメイン10種 | Mode 3 / Operation 3 / Boundary 6 / FailureClass 14 / ReceiptStatus 7 / MutationEffect 3 / PhaseKey 5 / ProjectSyncState 3 / ProjectMutation 2 / RegistryStatus 4 | 全件一致（正規表現による機械抽出） | 一致 |
| 22 | 終端状態 / ガード / 上限 | `:127-132` 4 種 / `:692-715` 4 本 / `:42` `MAX_RECEIPTS = 1000` | verbatim 一致 | 一致 |
| 23 | boundary→operation 写像 | `coordinator:230-244`、`intent-capture-approved` → `create` 固定 | `operationForBoundary` を verbatim 確認。`state.issueNumber` を参照しないのは当該分岐のみ | 一致 |

### 相違・精密化（実測を正とする）

| # | 対象 | Developer 報告 | Architect 実測 | 扱い |
| --- | --- | --- | --- | --- |
| R1 | mirror の遷移種数 | 「16 種（receipt 8 + 補助 8）」 | **21 種** = `amadeus-mirror-state-reducer.ts:55` の inline **18** 種 + `:113` `\| ProjectSyncTransition;` の入れ子 **3** 種（`CommitProjectReconciliationTransition` / `HoldForProjectSyncTransition` / `RetireProjectSyncHoldTransition`、`amadeus-mirror-project-reconciliation-reducer.ts:45-48`） | **相違** — 報告は warning 系3種（`set-warning` / `set-global-warning` / `clear-global-warning`）を1群に畳み、入れ子 union を数えていない。TLA モデルの遷移集合を決める数値であり、実測 21 を正とする |
| R2 | テスト面の件数 | 「`grep -rl formal-verif tests/` = 82」「formal-verif 系 72（unit 30 / integration 34 / e2e 8）」 | `grep -rl` = **93 パス**（うち `.test.ts` **72** = unit **29** / integration **35** / e2e 8。残り 21 は `fixtures/` `support/` と3台帳） | **相違** — 総数 72 は一致するが内訳が unit/integration で ±1 ずれる。`grep -rl` の 93 と 82 の差は fixtures・台帳の計上有無 |
| R3 | dist の plugin ファイル数 | 「39 ファイル」 | `find dist -path "*formal-model-check*" -type f \| wc -l` = **38**（変種数 8 は一致） | **精密化** — ディレクトリを含めるか否かの差 |
| R4 | 引用の所在表記 | 「`ci.yml:544〜`」「`reducer:…`」 | job キーは **`ci.yml:545`**（`:544` は `# U4 formal-model-check begin` マーカー行）。reducer の実ファイル名は **`amadeus-mirror-state-reducer.ts`**（`amadeus-mirror-reducer.ts` は存在しない） | **精密化** — 略記の解決。`cid:requirements-analysis:c1-ac-grep-surface-scope` の教訓どおり、後続段はフルパスで引用する |

いずれの相違も3 Issue の機序判定・修正方針・Bolt 分割には影響しない。

### 後続検証者向けの手法メモ（`cid:requirements-analysis:review-method-memo`）

- **判別ユニオンの濃度を数えるときは、入れ子 union を展開してから数える。** `grep -c 'kind: "'` は inline メンバーしか数えず、`| OtherTransition;` の1行を見落とす（R1 の機序）
- **`sed -n 'A,Bp;C,Dp'` の出力はファイル行順で並ぶ**ため、複数レンジを1回で読むと対応関係を取り違えやすい。行番号の確約には `grep -n` を使う
- ファイル数の実測は `find -type f` を明示する。`-type f` 無しはディレクトリを混入させる（R3）
- 本 intent の RE は base→HEAD 距離 12 だが observed→HEAD は 1 コミット（record のみ）。**新規に書いた file:line は observed `da51af375` でも同一に解決する**ため、後続段は HEAD / observed どちらで照合してもよい
