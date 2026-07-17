# Design Decisions — answer-preemption-guard

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜7)、codekb `architecture.md`・`component-inventory.md`、`../practices-discovery/team-practices.md`(変更 0 件)。

## ADR-1: (b) lint 化は不採用 — (a) sensor 単独(FR-6 の閉包)

- Context: Issue #922 は (a) sensor / (b) lint の2案を提示、併用可否は design 判断(pre-approved)。
- Decision: **(a) 単独**。
- 根拠: 検知窓は「記入時(sensor advisory)」と「ゲート時(gate-start fail-closed)」の二層で閉じる。(b) の増分価値は commit 済み corpus の CI 常時再検査だが、残余ケースは実務上無視できる: gate-start 通過後に questions が再編集されるケースは、その再編集 Write 自体が sensor 層(本 intent)の発火対象であり記入時点で loud 化される。両層とも通らず commit に至る経路は手動 git 操作のみで、(b) を置いてもその CI 検査は次 PR まで遅延する — 独自検知の実効価値は残らない(m-3 是正: 「構造的に発生しない」の断定を残余リスク明示へ弱め、その残余も sensor 層が写像することを明記)。
- Consequences: lint ジョブ・CI 面の変更ゼロ。将来 (b) が必要になった場合も述語・cutoff 定数は canonical 済みで追加コストは薄い。
- Alternatives Rejected: (b) 併用 — CI ジョブ追加コストと false-red 面(cutoff 適用の三重複製)に対し独自検知ゼロ。lint スクリプト単独 — Write 時検知(本 intent の目的)を持たない。
- セキュリティ/コンプライアンス影響: なし(read-only 検査の追加)。

## ADR-2: sensors: 宣言は全32ステージへ一括追加

- Context: AC-3a は「questions を produce する stage に限る」(R1 緩和)。機械列挙: 宣言 produce は18 stage(grep 実測)。しかし E-OC1 運用は**全 stage** で questions ファイルを慣行作成し(eoc1 で19 stage 全てに実在)、gate-start ガード(amadeus-state.ts:1725)も stage 非依存に検査する。
- Decision: **全32 stage の sensors: リストへ answer-evidence を追加**(grep -l '^sensors:' 実測 = 32/32)。発火の実選別は manifest matches `**/*-questions.md`(狭 glob)が担い、questions を書かない stage ではそもそも発火しない。
- 根拠: 宣言集合と検査対象(gate-start の全 stage 検査)の対称性(symmetric-pair-review)。18 stage 限定は慣行 questions(B&T 等)を検知漏れにする。
- Alternatives Rejected: 18 stage 限定(宣言 produce 準拠)— 慣行ファイルの盲点。hook 側 matches のみで選別し宣言追加ゼロ — sensors_applicable に載らない stage では hook が id を解決しないため不成立(scan-notes (e)(f) の compile 経路実測)。
- **裁定(E-APG-AD-DEV、2026-07-16 22:04:34Z 開票)**: X(全32 stage)採用 — e1=X(GoA 2、留保: AC-3a の遡及訂正根拠を requirements へ verbatim 転記 → 実施済み)・e2=X(GoA 1、独立再列挙 18/32 一致)・e3 後着。実装前停止→裁定→再開の手続き完了(deviation-stop-before-implement)。R1(diff 肥大)への回答: +32行は機械的1行追加で、matches 狭 glob により実行時コストは questions 書込み時のみ。
- **再裁定(E-APG-AD-DEV 再裁定、2026-07-16 22:53:17Z 開票)**: 前提部分不成立(初期化3ステージは `sensors: []` 明示+questions 慣行なし — eoc1 実測19 stage に初期化は不在)により **(i) 29 stage(sensors 実参加全数)採用**、初期化3の `sensors: []` は不参加宣言として維持(e1=1・e3=1・e4=1 実装当事者・e2 後着 1 — 根拠は「死に設定を作らない」で一致)。code-generation で t89 の初期化不変条件(Case 7/8)との衝突として顕在化 → builder 停止 → 既決適用(no-election-for-decided-norms)で 29/32 に確定。
- Consequences: stage frontmatter の変更が dist×5+self-install×2 へ伝播(機械的)。以後の新 stage 追加時は、questions を扱いうる作業ステージなら sensors: リストへの answer-evidence 追記が定型となる(初期化類の非参加ステージは `sensors: []` を維持)。
- セキュリティ/コンプライアンス影響: なし。

## ADR-3: cutoff 定数は amadeus-lib.ts へ canonical 移設(AC-2b 確定)

- Context: 消費者が gate-start と sensor の2箇所になる。
- Decision: `export const QUESTIONS_EVIDENCE_CUTOFF_YYMMDD = 260716` を checkQuestionsEvidence 直上に新設、state.ts は import へ置換(挙動不変)。
- Alternatives Rejected: 各所ローカル複製+同値テスト — drift 検知は可能だが canonical 1定義原則(construction ガードレール)に劣後。sensor 側だけ cutoff なし — corpus false-red 59件(#1106 実測)を再導入。
- Consequences: amadeus-state.ts の import 1行変更(挙動不変・値同一)。cutoff 変更時は1箇所編集で両層へ波及。
- セキュリティ/コンプライアンス影響: なし。

## ADR-4: script の対象外 skip は「pass + skipped フィールド」で表現

- Context: matches glob が questions 以外を弾くが、手動 fire は任意パスで呼べる(AC-1d)。
- Decision: 非 questions パス・cutoff 前は `pass=true, findings_count=0, skipped:"not-questions"|"pre-cutoff"` を返す(全フィールド dispatcher/finding が消費 — 検証劇場なし)。
- Alternatives Rejected: exit 1 で拒否 — advisory 契約(AC-1e)違反。無条件検査 — cutoff 前 corpus の false-red。
- Consequences: 手動 fire(任意パス)経路で skipped フィールドが実働し、finding/監査行から skip 理由が追跡可能。

## ADR-5: gen-coverage-registry への登録は不要(AC-5b の実測判断)

- Context: AC-5b は TOOL_DESCRIPTORS への登録要否を design で実測判断せよと要求。
- Decision: **登録不要**。実測: `tests/gen-coverage-registry.ts:255-268` の TOOL_DESCRIPTORS は switch/subcommand 型ディスパッチャ(amadeus-state.ts・amadeus-sensor.ts 本体等)専用で、per-sensor script(amadeus-sensor-required-sections.ts 含む既存4本)はいずれも未登録 — 前例踏襲。
- Alternatives Rejected: 新規登録 — per-sensor script は subcommand を持たず descriptor 様式に適合しない。registry 検証の省略 — `registry --check` green は AC-5c の検証列に含め、非登録の整合を機械確認する。
- Consequences: C-5 テストの coverage は in-process seam(main/evaluateAnswerEvidence export)で計測し、spawn 経路は E2E 検分に限る(bun-coverage-spawn-blindspot)。
- セキュリティ/コンプライアンス影響: なし。
