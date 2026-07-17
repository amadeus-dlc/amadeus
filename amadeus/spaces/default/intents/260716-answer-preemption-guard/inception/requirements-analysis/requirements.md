# Requirements — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): `../../ideation/intent-capture/intent-statement.md`(問題・成功基準)、`../../ideation/scope-definition/scope-document.md`(IN/OUT・B1〜B5)、codekb `business-overview.md`・`architecture.md`・`code-structure.md`(本日 RE 更新 — sensor 機構観測)、`../practices-discovery/team-practices.md`(変更 0 件判定)。機構引用は RE scan-notes.md の実測(observed `e530fc4b1`)からの転記で、起草時に conductor が主要行を再実測済み(enumeration-reverify-at-implementation の起草段)。

## FR-1: answer-evidence sensor の新設

`checkQuestionsEvidence`(amadeus-lib.ts:1173、export 済み・判別ユニオン :1144-1146)を呼ぶ per-sensor script と manifest を追加する。

- AC-1a: manifest `packages/framework/core/sensors/amadeus-answer-evidence.md` — frontmatter は既存スキーマ(scan-notes (d) 実測: id/kind=deterministic/command({{HARNESS_DIR}} プレースホルダ)/default_severity=advisory/category/matches/input_schema/output_schema/timeout_seconds)に準拠。`matches` は **狭 glob `**/*-questions.md`** とする(questions ファイル以外の書込みでは発火しない — 発火面の一次選別)。A1 実測(既存広 glob で questions に match=true)は「hook 経路が questions 書込みに到達する」ことの根拠として引用し、広 glob の再利用を意味しない。【遡及訂正 2026-07-16: AD reviewer Critical C-1(成果物間の glob 矛盾)の裁定 — 狭 glob へ統一。AC-1d の script 側 basename フィルタは手動 fire(任意パス指定可)経路で実働するため存置】
- AC-1b: script `amadeus-sensor-answer-evidence.ts` — dispatcher 契約(scan-notes (c) 実測: `--stage`/`--output-path` 受領、stdout JSON `{pass: boolean, findings_count: number, ...}`、id-agnostic 読み :576/:693-699)に準拠。`./amadeus-lib.ts` からの import は required-sections の前例(:1-3)に倣う。
- AC-1c: 検査意味論は述語の結果をそのまま写像する — fail:no-evidence / fail:unparseable-timestamp → pass=false(+理由を findings に格納)、pass 系4 reason → pass=true。**述語の再実装・意味論変更を含まない**(C1)。
- AC-1d: 非 questions ファイル(output_path の basename が `*-questions.md` でない)は pass=true(対象外スキップ、findings_count=0)— 発火面が広い matches でも誤検知しない。
- AC-1e: 検査の pass/fail に対して exit code は常に 0(advisory 契約 — dispatcher :511 と同じ「sensor 失敗 ≠ CLI 失敗」)。FAILED の可視化は dispatcher の finding ファイル+SENSOR_FAILED 監査行に委ねる。CLI 引数不備(--output-path/--stage 欠落等)は前例(amadeus-sensor-required-sections.ts:112 の fail 関数)に倣い exit 1(誤用は loud)。

## FR-2: enforcement cutoff の適用と canonical 化

- AC-2a: sensor 判定は gate-start と同じ cutoff(intent dir 先頭 YYMMDD ≥ 260716)を適用する — cutoff 前 intent の questions は常に pass(旧様式 corpus 59/111 の遡及 false-red 回避、#1106 設計の継承)。
- AC-2b: cutoff 定数は現在 handleGateStart 内ローカル(amadeus-state.ts:1721 `GUARD_CUTOFF_YYMMDD = 260716`)— 2箇所目の消費者が生まれるため **amadeus-lib.ts へ canonical 移設**し、gate-start と sensor の両方が同一定数を import する(R2 の一次緩和)。移設の具体位置は design で確定。
- AC-2c: 日付導出は gate-start と同一(record dir basename 先頭6桁 parse — :1722 と同義)。導出不能(parse NaN)時は pass(fail-open ではなく「測れないものを推定しない」— P2。ただし questions パスが intent record 外なら AC-1d で先に対象外)。

## FR-3: 発火宣言(stage frontmatter)

- AC-3a: `sensors:` リストへの `answer-evidence` 追加は **全 32 stage** とする。【遡及訂正 2026-07-16: E-APG-AD-DEV 裁定(X 採用、e1=X GoA 2・e2=X GoA 1・Y 受容度7)— 当初の「questions を produce する stage に限る」(宣言 produce 18 stage、grep 実測)は、E-OC1 慣行が全 stage で questions を作成し(eoc1 で 19/19 実在)gate-start ガード(state.ts:1725)も stage 非依存である実測により、慣行 questions の検知漏れを作るため拡大。発火の実選別は manifest 狭 glob が担う。e1 留保転記: 本遡及訂正の根拠(慣行 questions の実測)を requirements へ verbatim 転記すること — 本注記がその転記】対象目録は design が grep 全数列挙(enumeration-completeness-review)。
- AC-3b: compile 経路(amadeus-graph.ts の sensors: → sensors_applicable 解決 — scan-notes (e))が新 id を追加改修なしで解決すること(id-agnostic の実測確認)。hook(.claude/hooks/amadeus-sensor-fire.ts)は無改修(A1=YES の帰結)。
- AC-3c: runner-gen drift guard(`bun .claude/tools/amadeus-runner-gen.ts check`)が green のこと(stage frontmatter 変更は compile 対象)。

## FR-4: 落ちる実証(両側)

- AC-4a: 赤側 — 裁定参照なしの記入 fixture(cutoff 後 intent dir 名)で sensor が pass=false を返し、dispatcher 経由で finding ファイル+SENSOR_FAILED 監査行が生成されることを実測(注入は実行時に消費される実データ md — inject-runtime-consumed-lines)。
- AC-4b: 白側 — 実 corpus 全数 sweep(repo 内の全 `*-questions.md`、測定 ref 明記 — measurement-ref-in-artifacts)で false-red 0 を実測(corpus-sweep-for-new-guards)。cutoff 前様式・0問様式・裁定待ちプレースホルダ・N/A の4形が pass であること。
- AC-4c: 語彙衝突トレース — questions 定型ヘッダ(「E-OC1」等)と検査パターンの交差を机上トレースし、vacuity guard テスト(定型句のみの入力で空文化しない)をピンする(vocabulary-collision-vacuity-guard — 述語再利用のため主リスクは script 側フィルタ AC-1d の basename 判定)。境界ケースを最低1個テストに落とす: Answer 行の地の文にのみ E-code が出現する fixture(例: `[Answer]: A — E-OC1 とは関係ない`)は述語(ECODE_RE :1148 は行内任意位置マッチ)により evidence-present と判定される — これは C1 により変更不可の「述語の既知の限界」であり、sensor はその写像をそのまま返すことをテストで文書化ピンする(挙動変更ではなく限界の顕名化)。

## FR-5: 配布同期・検証

- AC-5a: `bun scripts/package.ts` + `bun run promote:self` で全ハーネス dist+self-install ツリーへ同期、`dist:check`/`promote:self:check` exit 0。
- AC-5b: `tests/gen-coverage-registry.ts` への新 script 登録(TOOL_DESCRIPTORS)+ registry 再生成が必要かを design で実測判断し、必要なら同一 PR で実施。
- AC-5c: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` 全 exit 0。push 前 local lcov で patch 未カバー 0(spawn-only 行は in-process seam — 既存 sensor script の main seam 前例に倣う)。
- AC-5d: 動作確認・E2E 検分は配布コピー(.claude/tools/)経由(no-canonical-direct-execution)。

## FR-6: (b) lint 化の採否

- AC-6a: application-design が (a) sensor 単独 vs (a)+(b) 併用を、feasibility の見立て((b) の増分価値 = cutoff 後 corpus の常時再検査に限定)と実装コスト実測で判断し、採否と根拠を design 成果物に明記する(pre-approved 分岐の閉包)。

## FR-7: Issue クローズ

- AC-7a: PR マージ(per-PR ユーザー承認)→ 着地面 grep 出力確認 → Issue #922 クローズ+in-progress:amadeus ラベル除去(close-after-landing-verification)。

## トレーサビリティ

| FR | 由来 |
|----|------|
| FR-1 | Issue #922 提案 (a)+intent-statement 機会節+scan-notes (c)(d) 実測 |
| FR-2 | constraint C2/R2+#1106 cutoff 設計+scan-notes (b) 実測 |
| FR-3 | constraint R1+scan-notes (e)(f) A1=YES |
| FR-4 | 成功基準1/2+corpus-sweep-for-new-guards+E-1101-CG |
| FR-5 | project.md Mandated(dist 同期・検証コマンド)+AC-6c 前例(eoc1) |
| FR-6 | ディスパッチ pre-approved 分岐(20:59:49Z、agmsg 出典)+feasibility 見立て |
| FR-7 | backlog B5+issue-lock プロトコル |
