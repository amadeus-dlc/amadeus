上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md, team-practices.md

# Application Design 設計論点 — test-pyramid-rebuild(#684)

## 記入プロトコル(E-OC1 / election-answer-after-ruling)

**[Answer] は空欄のまま**。回答は選挙裁定の受領後、または選挙不要判定→leader 承認後にのみ記入する(team.md requirements-analysis:no-election-judgment-gate、project.md election-answer-after-ruling)。本ファイルの起草者は勝手に記入しない。

- 選挙実施時: 裁定受領後に記入
- 選挙不要判定時: 1問1行の根拠種別を leader へ申告 → 承認 agmsg タイムスタンプを本ヘッダへ記載 → 記入(E-OC1 証跡)

> 裁定: E-TPR-AD 2026-07-17T13:20:01Z 開票(blind 3票+起草者、写像公開済み — agmsg 一次記録)。Q1〜Q5 すべて選挙で確定(既決導出でないため選挙実施)。ADR-01〜05 の基盤決定は E-TPR-RA Q1〜Q4+Forbidden の既決導出(選挙対象外)。
> GoA 内訳: Q1 1x2 2x1 / Q2 1x2 2x1 / Q3 1x3 / Q4 1x3 / Q5 1x3(受容度 6-7 帯、8 なし)。

すべての size 値・分類は `classifyTestSize`(唯一真実源、ADR-04)由来であり、これらの問いは size 判定方式ではなく **設計上の境界・表現・整合方式** を問う。

## Q1: コンポーネント境界 — 台帳生成の配置

サイズ分類台帳(C1)の生成ロジックを既存 `test_pyramid` コレクタ(`scripts/metrics-snapshot.ts:97-104`)の内側に統合するか、独立した台帳生成モジュール(`tests/lib/` 配下等)として分離するか。

- 案A: 既存コレクタ内に統合(`classifyTestSize` を既に呼ぶ `:102` へ台帳出力を足す)。最小変更だがコレクタの責務が増える
- 案B: `tests/lib/` に独立した台帳生成 seam を新設し、コレクタと移設 intent/#683 が共通利用。関心分離が明確だが新規モジュール

[Answer]: B — tests/lib 独立モジュール新設(コレクタ/移設 intent/#683 が共通利用、関心分離)。E-TPR-AD Q1=B(4/4)。**留保転記(e4, GoA2)**: 新設は buildLedgerRow/buildSizeLedger の最小構成に留め、既存コレクタは自前分類を持たず本モジュールを消費する一方向依存とする(分類経路の二重化禁止)。reuse inventory に明記する。

## Q2: 層責務仕様 — smoke tier の扱い(AC-3c)

smoke tier(現状 14件すべて medium、scan-notes:27)を tier×size 規約でどう扱うか。

- 案A: 規約対象外(別枠 — smoke は「起動確認」として size 上限を課さない)
- 案B: integration 相当(medium まで許容)として規約に含める

[Answer]: B — smoke は integration 相当(medium まで許容)として tier×size 規約に含める。E-TPR-AD Q2=B(3票一致、起草者推奨 A を blind 多数決が覆した)。**留保転記(e1, GoA2)**: smoke の size 上限は『medium まで』と明示し、large は tier 是正対象とする(青天井にしない)。

## Q3: ドリフトゲート設計 — tier の表現方式(C3)

tier-aware ドリフトゲート(設計のみ)が tier を導出する方式。

- 案A: ディレクトリ第1階層から導出(既存 `test_pyramid` コレクタ `:99` の `split(/[\\/]/)[0]` と同前提、A-2 踏襲)。追加アノテーション不要
- 案B: ファイルに明示 tier アノテーション(`// tier:` ヘッダ、`// size:` と同型)。ディレクトリ移動と無関係に tier を宣言可能だが新アノテーション契約が増える

[Answer]: A — ディレクトリ第1階層から tier 導出(既存 test_pyramid コレクタ split(/[\\/]/)[0] と同前提、A-2 踏襲・新アノテーション契約を足さない)。E-TPR-AD Q3=A(4/4)。

## Q4: 台帳生成の seam 方式 — 純関数の粒度

台帳生成 seam(C1、component-methods `buildLedgerRow`/`buildSizeLedger`)の in-process テスト可能性の担保方式。

- 案A: `buildLedgerRow`(1ファイル→1行、純関数)+ `buildSizeLedger`(行配列→集計、純関数)の2段。ファイル列挙・読取は呼び出し側が注入(既存 `test-size.ts` の pure 設計 `:81-82` 踏襲、既存コレクタの `env.readFile` 注入 `:98` と同型)
- 案B: 単一のスイープ関数に列挙・読取・集計を内包し、FS を env seam で差し替え(`coverage-project-gate.ts` の env seam architecture.md:80 と同型)

[Answer]: A — buildLedgerRow(1ファイル→1行)+buildSizeLedger(行配列→集計)の2段純関数、列挙・読取は呼び出し側が注入(既存 test-size.ts pure 設計踏襲)。E-TPR-AD Q4=A(4/4)。

## Q5: #683 整合方式 — tier キーの突き合わせ点(C5)

#683 層別カバレッジと C1 台帳の tier キー整合(FR-6)をどこで突き合わせるか。

- 案A: 既存 lcov 経路(`tests/run-tests.ts` の総%算出 component-inventory.md:153)の tier 分解を C1 台帳の tier 導出と同一ロジックで揃える計画
- 案B: C1 台帳と #683 出力を後段で突き合わせる整合レポートを別途計画(疎結合だが二重の tier 導出を持つ)

[Answer]: A — lcov 経路の tier 分解を C1 台帳の tier 導出と同一ロジックで揃える(二重導出回避・単一真実源に整合)。E-TPR-AD Q5=A(4/4)。
