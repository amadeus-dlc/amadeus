# Requirements：260705-persist-cid-metamain

## Intent 分析

### 目的

エンジンツールの無言故障 2 件（Issue #504、#507）を解消する。達成したい状態は次の 2 点である。

1. learnings persist で、異なる Intent の同名 candidate_id が衝突せず、追記をスキップした場合も無言にならない（#504）。
2. エンジン tools の全ファイルが、import しても副作用（即時 main 実行）なしにロードでき、CLI としての既存挙動は変わらない（#507）。

### 上流の位置づけ

- 要求の正は Issue #504、#507 である。intent-statement と scope-document は scope（bugfix）により SKIP のため存在せず、Issue 2 件とディスパッチ定型文（state-init 宛 DECISION_RECORDED に転記済み）が上流入力を代替する。
- コードベース知識は `aidlc/spaces/default/codekb/amadeus/`（本 Intent の reverse-engineering で 616d063e 基準へ増分更新済み。architecture、code-structure、business-overview を消費）を参照する。
- #504 の解消方式はピア協議（engineer1・engineer2・leader の 3 名回答、全員 A）で確定した（requirements-analysis 宛 DECISION_RECORDED 2 件に記録済み）。
- #507 の対象範囲は本 Intent の requirements-analysis で実測確定した（全 tools 走査で未ガード = Issue 記載の 5 件と一致）。

## 機能要求

### FR-1: learnings persist の cid 衝突解消と明示報告（#504、B001）

- FR-1.1: 新規に追記する learning の cid marker は `cid:<dirName>:<stage>:<cN>` 形式とする（dirName = 出所 Intent の record dir 名）。異なる Intent の同名 candidate_id が構造的に衝突しない。
- FR-1.2: 重複判定（idempotency 照合）は新形式 marker のみを対象とする。旧形式 marker（`cid:<stage>:<cN>`）は Intent 成分を持たず、照合キーに使うと別 Intent との誤一致（#504 の欠陥そのもの）が再発するため、照合対象にしない。
- FR-1.3: 既存の旧形式 marker は改稿しない（追記型資産、org.md の記録不改変と整合）。旧形式 marker 共存時の挙動をテスト可能な条件として明文化する: 同一 stage・candidate_id の旧形式 marker が既存ファイルに存在する状態で、修正後のツールが同一候補を persist した場合、新形式 marker で追記され、appended 側でカウントされること（already-present にしないこと。旧形式は Intent 不明のため照合に使えず、この稀な重複は許容して報告で表面化させる）。
- FR-1.4: persist の戻り値は appended と already-present を分離し、already-present（既存の新形式 marker により追記をスキップした件数）を rule_learned に数えない。スキップは無言にしない。
- FR-1.5: 同一 selections の再 persist は冪等である（2 回目は appended = 0、already-present = 件数分）。本冪等性は、対象 candidate の照合が新形式 marker で成立する場合（= 修正後に persist した learning の再 persist）に適用する。旧形式 marker 共存時の挙動は FR-1.3 を参照（新形式 marker が未生成の初回に限り appended 側で表面化する。初回の追記で新形式 marker が生成された後は、旧形式 marker が残っていても FR-1.2 の照合により冪等になる）。

### FR-2: エンジン tools の import.meta.main ガード（#507、B002）

- FR-2.1: 未ガードの 5 ファイル（`amadeus-sensor.ts`、`amadeus-sensor-required-sections.ts`、`amadeus-sensor-upstream-coverage.ts`、`amadeus-swarm.ts`、`amadeus-validate.ts`）のモジュール末尾の無条件 `main()` 呼び出しを `if (import.meta.main)` ガードで包む。
- FR-2.2: 5 ファイルとも、import しても副作用（main 実行、exit）なしにロードできる。
- FR-2.3: CLI としての既存挙動（引数処理、exit code、stdout/stderr）は完全同一を維持する。
- FR-2.4: 対象は実測で確定した 5 件のみとする（全 tools 走査済み。追加対象なし）。インストーラの module load 検査方式（bun build）の巻き戻し（Issue #507 候補 2）は installer 側の別判断としてスコープ外。
- FR-2.5: 「未ガード 0 件」を将来も保証するため、eval に全 tools 走査の回帰検査（無条件 main() 呼び出しの新規混入を fail にする）を含める。

## 非機能要求

- NFR-1: TDD で進める。B001 は「重複 cid の persist が無言 no-op にならない」「同一 selections の 2 回目 persist が rule_learned を増やさない（戻り値分離）」を先に RED で固定する（leader 条件）。B002 は「import 副作用なし + CLI 挙動不変」を先に RED（import 副作用検査は現状 FAIL する）で固定する。
- NFR-2: eval は隔離 workspace の実 CLI 駆動とする（Corrections c5/c7）。B001 は旧 marker 共存ケース（新形式で append される = 重複だが無言でない）を 1 本 pin して退行検出する（engineer1 実装注意）。
- NFR-3: エンジンツール修正には parity-map.json の宣言を伴わせる。`tools/aidlc-learnings.ts` は engineFileExceptions 宣言済み。#507 の 5 ファイル（`tools/aidlc-sensor.ts`、`tools/aidlc-sensor-required-sections.ts`、`tools/aidlc-sensor-upstream-coverage.ts`、`tools/aidlc-swarm.ts`、`tools/aidlc-validate.ts`）は未宣言のため engineFileExceptions へ追加し、exceptions に理由を追記する。Issue #507 受け入れ条件の「skills/ 正準ソースへの同一反映」は、対象 6 ファイル（#504 の amadeus-learnings.ts を含む）に skills/ 側の正準ソース複製が存在しない（実測確認済み）ため適用対象外である。
- NFR-4: 成果物は日本語で書き、機械可読ラベルは英語のまま使う。各成果物文書は required-sections sensor を満たす。

## 制約

- C-1: Bolt は B001（#504）→ B002（#507）の直列実行とし、PR の merge は人間が行う。
- C-2: PR 作成前に対象 Intent の validator と `npm run test:all` を実行し、結果を記録する。
- C-3: #428（engineer1、上流 2.2.0 同期）との接触面は交差ゼロを確認済み（対象 16 ファイルと本 Intent の対象 6 ファイルが非重複。state-init 宛 decision に記録）。codekb/amadeus/ の並行更新は reverse-engineering で統合済み。

## 前提

- A-1: #507 の未ガード 5 件は全 tools 走査の実測で確定している（Issue 記載と一致）。
- A-2: ピア協議の回答者は当事者性を持つ（engineer2 = #502 で cid 衝突回避を実地に踏んだ、engineer1 = cidMarker 実装 `amadeus-learnings.ts:407` をコードで裏取り）。
- A-3: #506（docs-only evidence の presence 相関検証）は契約級のため本 Intent に含めない（ディスパッチ承認要旨）。engineer2 の #506 採否確定後に接触面（amadeus-state.ts）を正式確認する申し合わせがある。

## スコープ外

- #506（presence 相関検証）。
- インストーラの module load 検査方式の変更（Issue #507 候補 2）。
- 旧形式 marker の一括改稿・移行。
- 旧形式 marker 同士の既存衝突の解消。

## 未解決事項

- O-1: persist 戻り値の JSON 形（フィールド名）は Construction（code-generation）で確定する。FR-1.4〜1.5 で使っている appended / already-present は暫定ラベルであり、テスト対象は挙動契約（追記件数と既存スキップ件数の分離報告）であってキー名そのものではない。
