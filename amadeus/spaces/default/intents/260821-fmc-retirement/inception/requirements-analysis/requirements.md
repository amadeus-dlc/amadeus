# Requirements — 260821-fmc-retirement

## 上流入力

`ideation/intent-capture/intent-statement.md`(裁定 Q1〜Q4)/ `ideation/scope-definition/scope-document.md`(In Scope 10 項目・裁定 Q1〜Q3)/ codekb `code-structure.md`・`architecture.md`・`business-overview.md` の「260821-fmc-retirement」節(observed `6a0c3b994`。一次記録 `codekb/amadeus/re-scans/260821-fmc-retirement.md` — 消費者全数 census の述語・件数はここが正本)。

## Intent 分析

FMC プラグインの完全退役(再設計までの削除)。RE 実測により削除フットプリントは **168 ファイル / 44,147 行超**(プラグイン 43/16,881 + class A テスト 100/25,580 + specs 21/1,686 — intent-statement の「7 .tla + cfg + model-map」は当初推定で、RE 実測 census により .tla 7 + .cfg 6 + model-map 1 = 14 + tla-evidence 7 = 21 へ精緻化)、エンジン側ハードコード 0 件(0-plugin baseline 成立)、github-pr-convergence 側参照 0 件が確定済み。

## Functional Requirements

### FR-DEL: プラグイン本体と形式仕様レイヤの削除

- **FR-DEL-1**: `plugins/formal-model-check/` 全 43 ファイルを削除する。受け入れ基準(配送先ツリー = マージ後 origin/main 断面への述語、対照リテラル付き実行): (a) ディレクトリ不在(`git ls-tree origin/main plugins/formal-model-check` 0 行) (b) `git grep -i -E "formal-model-check|tla-authoring|specs/tla" origin/main -- packages/ plugins/ scripts/ tests/ .github/ docs/ mise.toml` が **0 hit**。検索対象は列挙の 7 パス面のみ(`amadeus/` 配下 = record・codekb・ノルム・選挙ストアは経緯記録として対象外)。**FR-DOC-2 との両立規定**: docs へ新設する休眠明記は退役プラグイン名・ステージ名・パスのリテラルを一切含めない中立表現で書く(「advisory を宣言する同梱プラグインは現在存在しない」等。過去の経緯は git 履歴で辿れるため名指し不要)— したがって本述語と衝突しない。この書き分けは上位裁定(O-1 = 休眠明記)のどの経路も潰さない(c3-measurable-ac-must-not-void-ruling 検査済み)
- **FR-DEL-2**: `amadeus/spaces/default/specs/tla/`(14 ファイル)と `specs/tla-evidence/`(7 ファイル)を削除する。受け入れ基準: `git ls-tree -r origin/main --name-only -- amadeus/spaces/default/specs/tla amadeus/spaces/default/specs/tla-evidence` が 0 行、削除 diff の当該パス計数 = 21。`specs/rfc/` 4 ファイルは FMC 非依存につき残置(残置の確認: 同述語で specs/rfc が 4 行)
- **FR-DEL-3**: `amadeus/config.json` から `plugin.activation.names` の `"formal-model-check"` と `plugin.scope-bindings.formal-model-check` ブロック全体を除去する。受け入れ基準: 次 intent の compile で `tla-authoring` / `formal-model-check` ステージが stage graph に不在(**配送先ツリーの述語** — `bun .claude/tools/amadeus-graph.ts compile` 後の graph に 2 slug が現れない)
- **FR-DEL-4**: 生成 runner skill(`/amadeus-tla-authoring`・`/amadeus-formal-model-check`)は `bun .claude/tools/amadeus-runner-gen.ts write` の再生成で消滅させ、`check` drift guard green を確認する。self-install / 全ハーネス dist は `bun run build` で再生成(manifest が発見する全ハーネス対象 — cid:build-and-test:bt-dist-regen-seven-harnesses)。受け入れ基準: 隔離2回ビルド再現性検査・source-only 境界検査・グラフ不変量検査の 3 ゲート green(scope-document item 7 の明示継承 — CI blocking 集合で実測)

### FR-TEST: テスト面の分類実行(RE 分類 166 パスが正本)

- **FR-TEST-1**: class **A1 = 92** ファイル(FMC 本体が subject)を削除する。`tests/formal-verif/` は 16 ファイル全部が A1 でディレクトリごと削除
- **FR-TEST-2**: class **A2 = 8** ファイル(subject はコア advisory 機構、import は plugin-activation.ts のみ)は**温存**し、fixture 供給を FMC の plugin.json から**合成 fixture**(tests/fixtures 配下の advisory 宣言)へ差し替える — 梯子裁定 `auto-decision-53c6a4faaa9e06c34effe1742a6cc288`(O-1: コア advisory 機構は FMC 非固有につき退役スコープ外。休眠は FR-DOC-2 で明記)。**注**: plugin-activation.ts 自体は FMC ディレクトリ内にあるため削除される — A2 テストが被検とするコア側 advisory 機構(amadeus-advisory-choice.ts / amadeus-advisory-declaration.ts)への再配線を含む。再配線不能なテスト(plugin-activation.ts 固有の挙動を被検とするもの)は A1 へ再分類して削除し、application-design で 8 件を個別判定する。受け入れ基準: (a) 個別判定の結果(温存 n 件 + 再分類削除 m 件、n+m=8)を設計成果物に全数表で記録 (b) 温存 n 件は差し替え後に `bun test <n 件のパス>` exit 0(全 pass) (c) 温存 n 件の本文に `plugins/formal-model-check` への import・パス参照が 0 hit(`git grep -F "plugins/formal-model-check" origin/main -- <n 件のパス>` 0 行)
- **FR-TEST-3**: class **B1 = 16** ファイル(実ディレクトリ fixture 依存)は合成 test-fixture プラグインへ差し替える — 梯子裁定 `auto-decision-08dc84b9963cec50aff1c20d68cbbc9e`(O-2: 本番コードへのテスト分岐禁止原則の適用。github-pr-convergence への再標的は #3382 並行作業との結合につき不採用)。blocking job `plugin-conformance-e2e` の唯一のテスト t341 を含む。受け入れ基準: (a) t341 および B1 16 件が合成 fixture で `bun test` exit 0 (b) t341 の検査 assertion を弱体化しない — 差分は fixture パス・名称の差し替えと形状差(stages 数等)への追随に限り、assertion の削除 0 を diff 実読で確認 (c) 合成 fixture は conformance が検査する契約面(plugin.json スキーマ適合・stages ≥1・sensor manifest ≥1・advisories 宣言 — FR-TEST-2 の fixture と共用可)を備える(最小形状は application-design で確定)
- **FR-TEST-4**: class **B2 = 45** ファイルは FMC 依存部分のみ除去(文字列・パス・散文参照)。t2415 の同意述語(O-3)・t146 等の標本パスは削除後の実在パスへ張り替える
- **FR-TEST-5**: 生成台帳の resync — `tests/.coverage-registry.json` regen(`bun tests/gen-coverage-registry.ts`、build 後 — cid:code-generation:c5-regen-needs-build)、`tests/.coverage-patch-allowlist.json` の FMC 該当エントリ除去、台帳 5 ファイルの整合
- **FR-TEST-6**(O-5): coverage-registry で**唯一の被覆源を失うコア側 3 unit** に代替 targeted テストを追加し、Project Coverage Gate(絶対 AND 相対)を green に保つ。3 unit の同定は RE re-scan 記録の census を正とし、application-design で命名する

### FR-CI: CI・ツールチェーン面

- **FR-CI-1**: ci.yml の formal-model-check job(`:765-870`、106 行)、`needs:` 参照(`:905`)、`ci-success` の require_result(`:989`)を除去する。受け入れ基準: 除去後の PR で必須集約 `CI Success` green を merge queue 実測(cid:code-generation:c1-2814 — 「赤が止めるか」面の整合を同一変更で保つ)
- **FR-CI-2**(O-4): `scripts/detect-ci-changes.sh:15-16` の risk 判定 3 パターン中 FMC 由来 2 パターン(`amadeus/spaces/default/specs/tla/*`・`plugins/formal-model-check/*`)を除去し、`packages/framework/core/tools/amadeus-*.ts` パターンを残す。risk-tier が兼ねるフル e2e 層のゲート挙動が core 変更時に不変であることをテストで確認
- **FR-CI-3**(O-6): `mise.toml` の JDK ピン(`java = "temurin-26.0.1+8"` と `:3-13` の説明コメント)を除去する(JDK 消費者 37 hit 全数が FMC 面 — RE 実測)

### FR-DOC: docs 面

- **FR-DOC-1**: docs **24 ファイル**(RE の多軸+日本語語彙 census が正本)— 全面削除 4(`reference/21-formal-model-following{,.ja}.md` / `reference/22-formal-model-supply{,.ja}.md`)、索引張り替え 4(README{,.ja} / 00-overview{,.ja})、部分除去 16。t3028 docs-sync green
- **FR-DOC-2**(O-1 付帯): コア advisory 機構への advisory 供給プラグインが現在存在せず休眠する事実と、将来のプラグインが再供給しうる前提を、docs の該当面(guide/19-plugins 等の advisory 記述)へ 1 箇所明記する。**表現制約**: 退役プラグイン名・ステージ名・パスのリテラルを含めない(FR-DEL-1 の両立規定)。検証されない宣言面は作らない — 事実の記録のみ
- **FR-DOC-3**(O-3 の RE 本文面): `packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md:139-140` の `specs/tla` 散文(scan 対象からの非除外記述)を削除後の実態へ更新し、`bun run build` で全ハーネス投影へ反映する。受け入れ基準: FR-DEL-1 述語(`specs/tla` キーを含む)の 0 hit に包含

### FR-NORM / FR-ISS: ノルム・Issue 面(着地後)

- **FR-NORM-1**(O-7): 失効 cid の整理 — project.md 8 distinct + team.md 1(二層検証の形式検証面)を単独ノルム PR で改訂(intent-capture Q4=A、蒸留手順・矛盾監査)。件数の出典: `codekb/amadeus/re-scans/260821-fmc-retirement.md` の O-7 節(検索述語併記)— 蒸留 PR 起草時に同述語で再実測してから改訂する
- **FR-ISS-1**: FMC 系 open Issue(#3246 ほか — application-design で全数棚卸し)を理由コメント付きクローズ(intent-capture Q3=A、実行は削除着地の実読検証後 — cid:requirements-analysis:close-after-landing-verification)

## Non-Functional Requirements

- **NFR-1(green-throughout)**: 各配送 PR は単独で必須 CI green(テスト+コード同時削除の順序固定 — scope Q3=A)。既存の無関係な赤を新設しない
- **NFR-2(no-compat)**: 互換シム・スタブ・`if:false` 無効化・退役アーカイブディレクトリを作らない(org.md Forbidden の機械適用)。削除は削除
- **NFR-3(性能・security)**: 適用可能な数値 NFR は宣言されていない — 専用検査は生成しない(no-test-theatre-for-absent-nfr)。削除 intent であり新規外部境界なし
- **NFR-4(検証劇場禁止)**: 受け入れ基準の grep 述語は対照リテラル付きで実行し(zsh 配列規律)、blocking ゲートの除去(FR-CI-1)は「除去後も他ゲートが赤を止める」ことを ci-success の needs 実測で確認する

## Constraints

- `plugins/github-pr-convergence/` へ書き込まない(#3382 別エージェント作業中。依存は model-map→同プラグインの一方向のみで、削除により参照は消える — RE 実測で相互参照ゼロ確認済み)
- 検証は remote-first(リモート CI 正本)。walking-skeleton gate を最初の Construction Bolt に維持(self-feature Mandated)

## Out of Scope

新 FMC 再設計 / コア advisory 機構の退役(O-1 裁定によりスコープ外 — 休眠明記のみ)/ リリース系不可逆操作 / FMC 非依存の specs/rfc。

## Open Questions(後続ステージへ)

- A2 8 件の個別判定(温存再配線 vs A1 再分類)と、O-5 の 3 unit の命名 → application-design
- 合成 test-fixture プラグインの最小形(plugin.json + stage 1 本)の設計 → application-design

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-21T04:00:09Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: AC 衝突(FR-DEL-1 vs FR-DOC-2)・合否基準欠落(FR-TEST-2/3, FR-DEL-2)・O-3 RE本文面の孤児化。是正指示あり

### Findings

- BLOCKER | requirements.md FR-DEL-1 の 0-hit 述語(docs/ 含む)と FR-DOC-2 の docs 休眠明記が衝突しうる — 両立規定なし(c3-measurable-ac-must-not-void-ruling クラス)
- BLOCKER | requirements.md FR-TEST-2 / FR-TEST-3 / FR-DEL-2 に独立検証可能な合否基準が欠落(「空洞化させない」は測定不能)
- BLOCKER | requirements.md O-3 の RE ステージ本文 specs/tla 散文(reverse-engineering.md:139-140)更新が孤児 — FR-DEL-1 述語は specs/tla キーを検索しない(レビュアー申告 MAJOR を要是正として昇格)
- FOLLOW-UP | requirements.md FR-NORM-1 の cid 件数(8+1)の出典がスコープ内 codekb に不在 — 蒸留 PR で再検証
- NIT | requirements.md FR-DEL-4 に隔離2回再現性・source-only・グラフ不変量の明示継承なし

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-21T04:04:22Z
- **Iteration:** 2
- **Scope decision:** none

READY: iteration 1 の BLOCKER 3 件は全て解消(解消判定表で確認)、是正による新規矛盾なし。残指摘は FOLLOW-UP 1 + NIT 1(NIT は反映済み)

### Findings

- FOLLOW-UP | requirements.md FR-NORM-1 の cid 件数(8+1)の出典は re-scans 参照のみ — 蒸留 PR 起草時に同述語で再実測(手順明記済みにつき許容)
- NIT | specs/tla ファイル数の当初推定と RE 実測の差の由来を本文へ一言明記(反映済み)
