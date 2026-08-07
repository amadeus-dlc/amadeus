# Design Decisions — 260807-merged-pr-convergence

上流入力(consumes 全数): `requirements`(`inception/requirements-analysis/requirements.md` — FR-1〜FR-5 / AC-1a〜AC-4b を設計の合否面として消費)、`architecture`(codekb — 現在節の landed 未対応機序と kind 閉集合3面)、`component-inventory`(codekb — 対象4コンポーネント+stage 文書+テスト面の現況)。機構詳細の正本 = `codekb/amadeus/re-scans/260807-merged-pr-convergence.md`(observed `4a3da7d62`)。

## ADR-1. landed は ConvergenceReport の第3 variant として表現する

- **Context**: FR-3.1 は `kind: "landed"` の report を要求。表現方法に複数の実現形がある。
- **Decision**: 既存判別 union `ConvergenceReport`(cli.ts:61-76、`kind: "converged" | "override"`)へ第3 variant `landed` を追加し、`renderReport`(:89-129)に landed 分岐を足す。report ファイル・パス(`reportPathFor` :81-83)・センサー読取様式(`- label: value`)は共通のまま。
- **Consequences**: per-unit artifact guard・overlay 機構は無変更で landed report を成果物として受理する。センサーの kind 閉集合(FR-4)と t450 の renderReport-fixture に landed ケースを同時追加する(3面同時 — RE 注意1)。
- **Alternatives Rejected**: (a) **別ファイル名の landed report** — guard の produces 宣言(`pr-convergence-report`)と一致せず overlay 改修が必要になり、engine 無変更の Constraint に反する。 (b) **override の reason に「merged」を書く運用** — converged:false の虚偽記録と人間往復が残り、intent の目的自体を満たさない。
- **セキュリティ/コンプライアンス**: report は機微情報を含まない(PR 番号・SHA・timestamp のみ)。既存 stderr digest 化(gh-runner :108-110)は不変。

## ADR-2. MERGED 検出は fetchRawPrState の同一クエリで観測し、resolveMergeable の前で分岐する

- **Context**: FR-2.1 は retry ループ前の短絡を要求。観測手段に選択肢がある。
- **Decision**: `PR_STATE_QUERY`(gh-runner.ts:191-195)を1クエリのまま `state mergedAt mergeCommit { oid statusCheckRollup { state } }` へ拡張し、`RawPrState`(:76-79)に raw 文字列フィールドを追加。predicate 側に `PrLifecycleState`(`OPEN | CLOSED | MERGED` の閉集合、未知値 throw — `Mergeable` :124 と同形)の parse を新設し、status/report の呼び出し経路は **parse 済み state が MERGED なら resolveMergeable を呼ばずに** landed 経路へ分岐する。
- **Consequences**: マージ済み PR の応答は retry 0 回(AC-2a: sleep seam 呼び出し 0)。未マージ PR は既存経路を一切変更しない(AC-2c)。
- **Alternatives Rejected**: (a) **別クエリを追加して2往復** — gh 呼び出し回数が倍増し、2クエリ間の状態不整合(TOCTOU)窓を作る。 (b) **resolveMergeable 内部に MERGED 分岐を埋める** — mergeable 解決の単一責務(UNKNOWN リトライ)に lifecycle 判定が混入し、`MergeableOutcome`(:236-239)の意味論が濁る。
- **セキュリティ/コンプライアンス**: クエリ追加フィールドは公開 PR メタデータのみ。

## ADR-3. landed の判定値は verdict フィールドで運び、exit code は 0 を共有する

- **Context**: 本ステージ上流裁定(RA Q1=A)。JSON 面の形状は設計で確定する必要がある。**申告**: requirements の Open questions は「verdict フィールド名等の微細な形状は functional-design で確定」と委譲していたが、component-methods(メソッド・型契約)を扱う本 AD 段で確定する方が cross-artifact 整合を保てるため、本 ADR が委譲を引き取って確定する(FD で変更する場合は逸脱として申告)。
- **Decision**: `ConvergenceVerdict`(predicate.ts:161-166)へ `verdict: "converged" | "not-converged" | "landed"` 相当の判別フィールドを追加(既存 `converged: boolean` は互換維持 — landed では false)。status の stdout JSON に `verdict` を含め、exit は landed=0 / converged=0 / not=1 / fault=2。
- **Consequences**: 既存消費者(exit のみ読む側)は landed を「残作業なし」として扱える。JSON を読む側は判別可能。
- **Alternatives Rejected**: (a) **converged: true に丸める** — 事実に反する記録で P2(実測事実のみ)違反。 (b) **新 exit code 3** — RA Q1 で棄却済み(既存消費者の契約拡張)。
- **セキュリティ/コンプライアンス**: 影響なし。

## ADR-4. センサーの landed 規則は「converged=false 必須 + mergedAt/merge SHA 実在必須」とする

- **Context**: FR-4.1。sensor は core 側(amadeus-sensor-pr-convergence-report-format.ts)にあり plugin を import できない(:16-20)。
- **Decision**: kind 閉集合(:69)へ `landed` を追加。整合分岐(:122-130)に (i) `kind === "landed" && converged === "true"` → 矛盾 finding (ii) `kind === "landed"` で `merged at` / `merge commit` フィールド欠落 → missing finding、を追加。`statusCheckRollup` は informational につき検査必須にしない(RA/intent-capture Q3=A)。
- **Consequences**: 手書き landed report の偽装(converged:true 化・SHA 欠落)を advisory finding として検出。既存 converged/override 検査は無変更。
- **Alternatives Rejected**: (a) **rollup green を landed の成立条件に検査する** — Q3=A(informational)違反かつ required/optional 非区別の弱い主張(predicate :176-178)を強い主張に昇格させてしまう。 (b) **landed を検査対象外にする** — 検証劇場 Forbidden(どのコードも消費しない語彙)に近づき、手書き偽装を素通しする。
- **セキュリティ/コンプライアンス**: ゲート緩和なし(advisory 契約 :153-161 維持)。

## 規模の正当化と Reuse Inventory

| 変更面 | 見積り(行) | 再利用 |
|---|---|---|
| gh-runner.ts(クエリ+RawPrState 拡張) | +15〜25 | 既存 fetchRawPrState / Result 型をそのまま拡張 |
| predicate.ts(PrLifecycleState parse + verdict 拡張) | +30〜50 | `Mergeable.parse` の閉集合様式を複製せず同形の新 companion で追加 |
| cli.ts(landed 分岐 + variant + render) | +40〜70 | 既存 verb dispatch / writeReport / seams(ghSpawn/sleep/now)を無改変再利用 |
| sensor(kind + 整合分岐) | +15〜25 | field()/finding 既存ヘルパー再利用 |
| stage 文書 + docs | +30〜60 | 既存節構成への追記のみ |
| テスト(t481〜: predicate/cli/sensor + t446/t448/t450 追補) | +150〜250 | 既存 scripted GhSpawn / renderReport-fixture 様式を再利用 |

新規の機構・ジョブ・ツールは導入しない(既存 CLI/センサー/テストランナーの拡張のみ)。adapter・外部契約の先行着地なし(実装+配線+テストが本 intent で揃う)。後方互換シム・二重実装なし(landed は新状態の追加であり既存挙動の置換を伴わない)。
