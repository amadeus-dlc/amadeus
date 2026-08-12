# Requirements — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): intent-statement.md(問題定義・完了条件・確定済み裁定 (a)〜(f) を FR の導出元に使用)、scope-document.md(In/Out 境界と proto-Unit 構成を FR 分割へ反映)、business-overview.md(本リポジトリが AI-DLC フレームワーク自身であり検証規律が grep 全数列挙に依存するという事業文脈を Intent analysis に使用)、architecture.md(core/harness/scripts の正本境界と source-only 配布構造 — ゲートを repo-only の tests/ 層へ置く判断の根拠)、code-structure.md(tests/ 配下の走査系ゲート群の配置先例 — FR-CBG-7/15 の配置整合に使用)。条件解決で除外された consumes: team-practices(required:false)— self-feature スコープで practices-discovery が SKIP のため不在(設計上の期待どおり。チーム実務は memory 層のノルムとして ambient 適用済み)

## Intent analysis

ユーザーの目的は「機能追加」ではなく**検証規律の保全**である。制御バイト混入は git diff・grep・レビューのすべてに構造的に不可視(intent-statement.md の Problem Statement)であり、business-overview.md が記す本プロジェクトの運用(grep ベースの全数列挙・不在主張・棚卸しを一次検証手段とする)そのものを無音で崩す。よって成功の定義は「混入が PR 段で loud に赤くなること」+「正当なコーパスで恒久グリーンであること」の両立に尽きる。

RA 裁定(requirements-analysis-questions.md、AUTO_DECIDED): Q1=full-tree(走査対象は全 tracked ファイル)/ Q2=c0-full(C0 全域 + DEL)/ Q3=temp-commit(恒久 fixture なし)。Q1 は Issue 宣言 5 dirs からの拡大だが Issue タイトルおよび reviewer-1 訂正提案 6 への一意整合(ゲート開示事項)。

## Functional requirements

### FR-CBG-1: 決定的検出検査の新設
tracked ファイルへの制御バイト混入を検出する standalone 検査スクリプトを新設する(配置は tests/ 配下 — code-structure.md の走査系ゲート先例と同層。正確なファイル名は設計で確定)。決定的(同一ツリー → 同一結果)・ネットワーク非依存・Bun のみで実行可能。受け入れ: 検出 0 件で exit 0、1 件以上で非 0 exit。

### FR-CBG-2: 走査対象 = 全 tracked ファイル
走査対象は `git ls-files -z` が列挙する全 tracked ファイル(Q1 裁定 full-tree)。untracked・gitignored(dist/ 等、architecture.md の source-only 境界)は対象外。日本語パスを含むため列挙は `-z` 起点でバイト安全に処理する。受け入れ: 走査ファイル数がコマンド出力から転記され、`git ls-files` 件数と一致する。

### FR-CBG-3: 検出バイト集合
検出対象は 0x00-0x08 / 0x0B / 0x0C / 0x0E-0x1F / 0x7F(TAB 0x09・LF 0x0A・CR 0x0D を除く C0 + DEL — Q2 裁定 c0-full。表示層 canonical `CONTROL_CHARS`(amadeus-lib.ts:4298)と整合、0x0C(FF)の扱いの差は設計で明文化)。受け入れ: 各バイト値クラスに対する検出/非検出の unit テストが実行時生成バイトで固定される。

### FR-CBG-4: 生バイトのみ検出
エスケープ表記リテラル(ソース上の `\x00`・`\u0000`・`String.fromCharCode(0)` 等)は検出しない — バイトレベル走査により構造的に成立。受け入れ: エスケープ表記のみを含むファイルが green になるテスト。

### FR-CBG-5: 正当バイナリの明示 allowlist
検査述語を通過できない正当ファイルは明示 path allowlist で除外する。初期内容は `assets/AI-DLC-Workflows-2.0-Specification.pdf` 1件(RE 実測: 全 tracked 16,124 中、制御バイト保持は本件のみ)。allowlist への追加は理由の記載を必須とし、実在しないパスのエントリは検査を赤にする(stale エントリの fail-closed)。受け入れ: allowlist 対象が skip され、stale エントリで非 0 exit。

### FR-CBG-6: 診断メッセージの名指し
検出時のエラー出力は、該当ファイルパス・最初の該当バイトのオフセット(10進)・バイト値(16進)を1行で名指す。受け入れ: 注入テストでメッセージ書式(パス+オフセット+バイト値)を assert。

### FR-CBG-7: CI blocking 配線
検査は CI の blocking step として実行する。先例形(ci.yml の走査系ゲート群 — standalone `bun tests/<name>.ts --check` 単一 step)に従う。受け入れ: 検出ありで CI ジョブが fail する(落ちる実証 FR-CBG-9 で実測)。

### FR-CBG-8: 全変更クラスでの起動保証
docs-only・amadeus-only を含む**あらゆる tracked ファイル変更の PR** でゲートが実行されること。現行 `scripts/detect-ci-changes.sh` は docs/** 一般・amadeus/** で full=false のため(RE 実測)、既存 lint ジョブへの単純同居では空文化する — 実現手段(無条件実行の独立 step/job、または detect-ci-changes への分岐追加)は設計で確定するが、「docs-only PR で走らない」構成は受け入れ不可(cid:build-and-test:ci-paths-ignore-doc-guard-blindspot の封鎖)。受け入れ: 起動条件の実測(該当 workflow 定義の実読+変更クラス別のトリガー表)— application-design 段でこのトリガー表を合否閾値(変更クラス一覧 × 起動有無の全数マトリクス)へ精緻化する。

### FR-CBG-9: 落ちる実証
一時注入→赤実測→復元→残渣ゼロ確認の不可分1セット(Q3 裁定 temp-commit — 恒久生バイト fixture をツリーに置かない)。注入面はゲートが実際に読む面(working tree か commit 断面か)を実測してから決める(cid:code-generation:injection-surface-verify)。受け入れ: 赤の exit code・メッセージ実文・復元後の残渣ゼロ(バイト走査 0 件+git status clean)が記録される。

### FR-CBG-10: 偽陽性ゼロ sweep
実装時点の全 tracked コーパスへ検査を適用し、allowlist 適用後の検出 0 件を実測する(コマンド+exit code を記録)。受け入れ: sweep 結果 0 件(RE 実測の再確認: スコープ内 NUL/C0 保持は PDF のみ)。

### FR-CBG-11: 述語の canonical 導出
検査述語は `amadeus-migrate.ts:477` の `isUtf8`(`buffer.includes(0)`)の意味論(バイト直接判定)から導出し、新規の判定概念を発明しない。C0 全域への拡張(FR-CBG-3)は既存 `CONTROL_CHARS`(amadeus-lib.ts:4298)のバイト集合定義を byte 版へ写して行い、両 canonical との関係をコード内コメントで明文化する。受け入れ: 述語定義に両導出元への参照が実在。

### FR-CBG-12: unit テスト(実行時生成バイト)
述語・allowlist・オフセット報告の unit テストを追加する。生バイトは実行時生成(`Buffer.from([...])` — t427/t499/t225 の既習形)で作り、ハッピーパス+エラー/エッジ最低2件(例: 空ファイル、TAB/LF/CR のみ、多バイト UTF-8、allowlist 命中、stale allowlist)を含む。TDD(Red→Green の vertical slice)を既定とする。受け入れ: テストが既存ランナー階層(unit/integration の size 分類 — 実 FS を使う検証は integration 層)に適合して green。

### FR-CBG-13: grep 系非依存のバイト走査
検査の実装はシェル grep 系(ugrep ラッパの無音脱落 — RE/レビュー実測)に依存せず、ファイルをバイナリ読取して直接判定する。受け入れ: 実装に外部 grep 呼び出しが存在しない(実読確認)。

### FR-CBG-14: 実行時間
full-tree 走査(16,124 files、実測時点)が既存ゲートの timeout 先例(ci.yml の no-silent-drop step は `timeout 30s`)内に収まること。受け入れ: ローカル実測の実行時間記録(30 秒未満)。

### FR-CBG-15: ローカル起動経路
CI と同一コマンドでローカル実行できること(直接 `bun tests/<name>.ts --check` 形。package.json alias は no-silent-drop 先例(package.json:24)に倣い任意)。受け入れ: README 等への追記は不要(既存ゲート群も docs 非掲載の先例)、コマンドが検査結果を stdout/stderr へ人間可読で出す。

### FR-CBG-16: 検証劇場の排除
検査結果は実行結果からのみ導出する — status ハードコード・自己参照比較・未消費の検証フィールドを置かない(org.md Forbidden)。受け入れ: reviewer による実読確認+落ちる実証(FR-CBG-9)の成立。

## Non-functional requirements

- **NFR-1 決定性**: 同一 tracked ツリーに対し常に同一の verdict(時刻・環境変数・ネットワーク非依存)。
- **NFR-2 可読性のある失敗**: 検出時の出力は該当ファイル全件を列挙(先頭 N 件打ち切りをする場合は総件数を併記 — 無音打ち切り禁止)。
- **NFR-3 fail-closed**: 読取不能な tracked ファイル(権限等)は skip せず検査エラーとして非 0 exit(t55 の NUL-skip 型 fail-open を再生産しない)。
- **NFR-4 依存追加ゼロ**: ランタイム依存を追加しない(Bun 標準 API のみ — 配布フレームワークの Bun-only 前提)。

## Constraints

- ゲートは repo-only(tests/ 層)に置き、`packages/framework/core/` へは置かない(全ハーネス dist へ投影される — architecture.md の core/harness 境界と harness-tools-placement 先例)。
- TDD 既定(team.md tdd-default-with-narrow-exceptions)。coverage patch/project gate・complexity・dist drift の既存 blocking 集合を全て満たす。
- 実装 PR は Bolt 単位で発行し、マージはユーザー承認後(no-AI-merge)。

## Assumptions

- コーパスの清浄性は RE 実測(2026-08-10、observed f1270d710)に基づく。**採択済み走査範囲(Q1 full-tree)の母集団は全 tracked 16,124 files であり、その実測は「NUL 保持 = `assets/AI-DLC-Workflows-2.0-Specification.pdf` 1件のみ(first NUL offset 248)」**。なお「2,576 files で C0 ゼロ」は Issue 宣言 5 dirs 断面の別測定(部分集合のクロスチェック)であり、完了条件(3) の evidence base は full-tree 側 — full-tree 全域での C0 全集合(FR-CBG-3)sweep は FR-CBG-10 が実装時の必須実測として担う。base 前進で新規バイナリが入った場合は allowlist 追加または再実測で吸収(c5-ratchet-census-at-final-base — 初期 census はマージ先最終 base で採る)。
- `.claude/sensors/` は untracked のため走査対象に構造的に入らない(RE 実測: tracked 0 件)。sensor manifest 形態は CI blocking にならないため実装形態として不採用(RE 実測: ci.yml に sensor 参照 0 件)。

## Out of scope

- ノルム追記のみの対応 / .gitattributes 委譲 / 点在防御(migrate 検証・表示層 strip)の改修 / リリース成果物側の検査 / `t55-test-suite-drift` の NUL-skip 穴の改修(scope-document.md のアウト境界と同一)。
- エスケープ表記の検出(FR-CBG-4 の対偶)。

## Open questions

- 実装形態の最終確定(独立 CI step/job vs detect-ci-changes 分岐 — FR-CBG-8 の実現手段)→ application-design へ送付。
- allowlist の保持形(スクリプト内定数 vs 別ファイル台帳)→ application-design へ送付。
- 0x0C(FF)の検出集合帰属の明文化(CONTROL_CHARS は 0x0C を strip 対象に含む(0x0B-0x1F 範囲内)ため差異なしの見込みだが、設計で byte 集合表を確定)→ application-design へ送付。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T09:42:18Z
- **Iteration:** 1
- **Scope decision:** none

必須7節・FR16件(Standard帯適合)・完了条件(1)-(4)と裁定(a)-(f)の追跡可能性は成立。ただし Assumptions 節の偽陽性ゼロ根拠の測定母集団(2,576 files)が採択済み走査範囲 full-tree(16,124 files)の測定値と食い違う自己矛盾があり測定 ref の一意性を欠くため BLOCKER 差し戻し。

### Findings

- BLOCKER | requirements.md:Assumptions — 偽陽性ゼロの evidence base が同一文書内で 2,576 files(宣言スコープ断面)と 16,124 files(full-tree)の二通り併存し、完了条件(3)の母集団が一意に読めない。Assumptions を Q1 採択の full-tree 実測へ統一するか、2,576 断面が別測定であることと FR-CBG-10 の full-tree 再確認必須を明記して解消すること。
- FOLLOW-UP | requirements.md:上流入力ヘッダ — consumes 宣言の team-practices(required:false)が不在である根拠(practices-discovery SKIP)の負方向明示がない。
- FOLLOW-UP | requirements.md:FR-CBG-8 — 受け入れ基準の「変更クラス別トリガー表」は application-design で合否閾値(変更クラス×起動有無の全数マトリクス)へ精緻化されることを期待する旨の一言を推奨。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T09:44:01Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 の3指摘は全て閉包を実読確認(Assumptions の母集団を full-tree 16,124/NUL=PDF offset 248 へ統一・2,576 は部分集合クロスチェックと明記・team-practices 除外の負方向明示・FR-CBG-8 の設計段マトリクス精緻化文言)。是正による新規矛盾なし。残余は 0x0C 帰属の application-design 送付(既管理の open question)のみ。

### Findings

- FOLLOW-UP | requirements.md:Open questions — 0x0C(FF)の帰属明文化は application-design 送付のまま(元々 open question として適切に管理されており新規の問題ではない)。
