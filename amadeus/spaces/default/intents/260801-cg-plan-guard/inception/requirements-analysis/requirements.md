# Requirements — 260801-cg-plan-guard

上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md

- `intent-statement.md` の裁定済み骨子5点と `scope-document.md` の M1〜M7 / Won't を FR 骨格へ転記した。
- `architecture.md` / `code-structure.md` の現在節(260801-cg-plan-guard、observed `cb809c4de`)が確定した患部3点・SWARM 証拠・corpus を各 FR の患部引用と検証要件の導出元とした。
- `business-overview.md` の現在節の delivery boundary(B1→B4、skeleton gate 維持)を実装順序の前提とした。

## Intent 分析

計画(units-generation / delivery-planning)が宣言した実行形態(並行幅・依存)と CG の実際の実行形態の乖離を、engine の fail-closed ガードで機械検出・阻止する。実測(18 intent 横断、2026-08-01)で計画不履行4件 — 真因は「prose の計画が machine directive にならず conductor の非タスク化で無音に落ちる」こと。ガードの狙いは禁止でなく redirect(3部メッセージで計画訂正へ誘導)であり、実行形態の正本を計画成果物1箇所に保つ。#1893(edge block 様式逸脱の現物)を同梱し、判定入力(bolt_dag)の信頼面も同時に閉じる。

## 承認系譜(approval-lineage)

1. 要件骨子5点: Issue #1892 本文のユーザー裁定(2026-08-01)。
2. 編成(#1892+#1893、#1894 除外)・スコープ self-feature: ユーザー承認(2026-08-01「あなたの推奨でintent化しよう」)。
3. #1893 修正方向 = **B: record 是正**(parser 寛容化しない): クロスレビュー2名の実測収斂を受けたユーザー裁定(2026-08-01、questions ファイル参照)。
4. 要件3の射程 = **(a) absent または malformed(computeBoltDag 源泉)+(c) 区別不能面を対象。autonomy 未設定×並行幅宣言はラダープロンプトへの redirect 発動**: 当初裁定(2026-08-01)は「malformed 対象外」だったが、前提の不完全(compile 経路の無音)を §12a reviewer が捕捉し、正前提でユーザー再裁定(2026-08-01、questions Q2r 参照)。
5. #1893 クロスレビュー2名成立(コメント投稿済み、編入前提充足)。

## 機能要件

### FR-1: directive 発行側ガード(両方向)

- 患部: `amadeus-orchestrate.ts` `tryEmitSwarm`(`:2919-`)/ `firstUncoveredBatch`(`:2843-`)近傍。現行は bolt_dag 不在・autonomy null で無音 false → per-unit 直列降格(`:2937`/`:2935`)。
- 要件: bolt_dag が並行幅 ≥2 の batch を宣言している状態で per-unit 直列 directive を発行しようとした場合、error directive(3部メッセージ)で停止する(並列計画→直列 = 計画不履行)。逆方向(bolt_dag が依存 edge で直列を宣言しているのに invoke-swarm が依存違反の並列 batch を組む場合)も発動 — ただし batch 構成は bolt_dag 由来のため、逆方向の主発動点は FR-2 の実績突合(engine 迂回の手動 fan-out)である旨を設計に明記。
- AC-1a: 並行幅2の bolt_dag fixture で per-unit 直列経路へ進もうとすると error directive(修正前 Red: 無音 per-unit 降格)。
- AC-1b: autonomy 未設定×並行幅宣言では、汎用エラーでなく**ラダープロンプト(autonomy 設定)へ redirect する3部メッセージ**で発動(裁定4)。
- AC-1c: degrade スコープ(bolt_dag 構造的不在)と skeleton-gate stage は発動対象外をテスト固定(誤発動禁止)。

### FR-2: stage approve 時の実績突合

- 要件: code-generation の approve 時、bolt_dag が並行 batch を宣言している場合は audit の SWARM イベント実績(SWARM_STARTED/COMPLETED — `amadeus-swarm.ts:325-327` が唯一の emitter)と突合し、宣言 batch に対応する SWARM 実績が無いまま全 unit covered なら approve を拒否する(3部メッセージ)。
- 逃し弁: 計画訂正(edge+理由追記 → compile → 再評価)のみ。実行時申告 verb は新設しない(裁定2)。
- AC-2a: 並行宣言あり×SWARM 実績 0×全 unit covered の fixture で approve 拒否(修正前 Red: 通過)。
- AC-2b: SWARM_STARTED+COMPLETED 実績ありで approve 通過。SWARM_DEGRADED(subagent floor 降格)は「並行実行の実績」として通過側(degrade は driver の降格であり形態の降格ではない — 設計で fan-out 実績の判定基準を確定)。
- AC-2c: 正当直列(bolt_dag 自体が直列 edge)では突合を要求しないことをテスト固定。

### FR-3: bolt_dag の無音面の fail-closed 化(裁定4 の射程)

- 対象は2面(再裁定 2026-08-01: 当初の「malformed 対象外」は前提が半分のみ真 — `recoverBoltDag` の throw は orchestrator の別経路限定で、compile 経路の malformed は hook が stderr を飲み完全無音。§12a reviewer の捕捉を受けた正前提での再裁定):
  - **(a) absent または malformed 面(computeBoltDag 源泉)**: `computeBoltDag` のファイル不在 `undefined`(`amadeus-runtime.ts:302`、stderr すらなし)**および parse 失敗 `undefined`(`:305-311`、stderr は hook `amadeus-runtime-compile.ts:205-217` が exit 0 時に読まず飲む)**。units-generation を実行したスコープではどちらも loud エラー。`:789` の `if (boltDag)` は欠落理由非依存のため修正は自然に一般化。recoverBoltDag の既存 throw(orchestrate:1490-1491)は無改変で維持。degrade スコープ(units-generation SKIP)は正常系として維持。
  - **(c) 区別不能面**: compile の `if (boltDag)` 条件付き append により、下流が「units 無し scope」と「dag 欠落」を区別できない — runtime-graph に欠落理由の判別情報を残す(方式は design)。
- AC-3a: units-generation 実行済みスコープ×ファイル absent で loud エラー(修正前 Red: 無音 undefined)。
- AC-3a2: 同スコープ×malformed edge block(#1893 の `- id:` 形式 fixture)で compile 経路が loud エラー(修正前 Red: exit 0+stderr 飲み込まれ)。
- AC-3b: degrade スコープでは従来どおり無音(誤発動禁止)。
- AC-3c: 下流(next)が「dag 欠落」を判別できることをテスト固定。

### FR-4: 3部メッセージ契約

- FR-1/FR-2/FR-3 の全ガードメッセージは (1) 観測事実(数字: 宣言幅・対象 unit 名) (2) 重み(実測根拠 — #1892 の 18 intent 中4件への参照) (3) 公認の出口(unit-of-work-dependency.md / bolt-plan への edge+理由追記 → `bun <harness>/tools/amadeus-runtime.ts compile` → 再実行。逸脱裁定が要る場合は先に裁定へ)の3部を持つ。
- AC-4a: 各ガードメッセージの3部実在を機械検査するテスト(部欠落で Red)。

### FR-5: #1893 — 260712 record の edge block 是正(裁定 B)

- `260712-metrics-observation/inception/units-generation/unit-of-work-dependency.md` を仕様形へ是正: 3構造(`- id:` → `- name:` / `edges:` 節削除 / `depends_on:` 行末インラインコメント除去)+H2 floor(≥2)違反の解消。是正後 `parseBoltDag` が ok / batches `[["U1","U2"],["U3"]]`(散文と一致 — レビュー実測の変種 C)。
- parser(`parseUnitsBlock`)は無改変(寛容化しない — 機械可読ミラー契約の維持)。
- AC-5a: 是正後 sweep が 38/38 ok(修正前 Red: 37/38)。
- AC-5b: required-sections センサーが当該ファイルで pass。
- 注: 完了済み record の是正だが、対象は「散文の書き換え」ではなく機械可読ブロックの様式適合(記録の意味は不変 — 散文 DAG と一致させる方向)。audit 無改変。

### FR-6: 落ちる実証+corpus sweep

- 両方向の違反注入で赤(FR-1/FR-2)、absent 注入で loud(FR-3)、正当直列6件相当+計画不履行4件+#1893 是正後 record の corpus(10+1)で期待どおりの緑/赤をテスト固定(cid:code-generation:corpus-sweep-for-new-guards の両側実測)。
- 注入は「テストが実際に読む面」へ(injection-surface-verify)、1セット厳守(falling-proof-injection-one-set)。

## 非機能要件

- NFR-1(誤発動ゼロ): 正当直列・degrade スコープ・skeleton-gate への誤発動は Critical 扱い — corpus sweep を blocking の完成条件とする。
- NFR-2(fail-closed の非弱体化): 既存の malformed throw(recoverBoltDag)・センサー検査は無改変で維持。新ガードは追加のみ。
- NFR-3(性能): ガード判定は既読データ(bolt_dag・audit)の突合のみで新規 I/O を増やさない(approve 突合の audit 読みは既存 readAllAuditShards の再利用)。実時間ベンチ持ち込み禁止。
- NFR-4(配布整合): core 変更につき dist 7面+self-install の9コピー同期、drift gate green 維持。

## 制約

- トランクベース・Bolt ごと PR・スカッシュ(team.md)。self-feature につき最初の Construction Bolt は walking-skeleton gate 維持(Mandated)。
- 実装は worktree 分離(solo-bolt-worktree-required)。coverage 単独所有。マージは個別ユーザー承認(no-AI-merge)。
- TDD 既定(Red verbatim → 最小 Green)。pinned-behavior の明示改訂宣言: next の directive 発行挙動を pin する既存テスト(t135 系の stdout parse、t186 の {unit-name}、graph golden t110/t124 等)は実装前に grep 棚卸しし、改訂が要るものを plan で宣言する(CR-5 同型)。
- 逃し弁の唯一性: 実行時申告 verb・env による skip を新設しない(検証劇場 Forbidden の予防)。

## 前提

- ソロモード。仕様裁定はユーザー専権(本書の裁定4件は承認系譜に固定)。常任グラントはソロ不活性(#1904)のためゲートは都度ユーザー承認。
- #1892 の調査結果(不履行4・正当6・判定不能2)は Issue 本文の実測を正とし再調査しない。
- 患部引用は observed `cb809c4de` で verbatim 直読済み(re-scans 正本)。
- SWARM イベントの emitter は amadeus-swarm.ts のみ(検証劇場でない一次証拠)。

## 未解決事項(後続ステージへ)

- FR-2 の「並行実行の実績」判定基準の細部(SWARM_DEGRADED の扱い、複数 batch 中の部分実績)— design で確定。
- FR-3(c) の判別情報の表現(runtime-graph のフィールド vs 別ファイル)— design で確定。
- FR-1 逆方向(直列計画→並列)の発行側での検出可能性 — design で FR-2 への委譲範囲を確定。
- テスト採番 — units-generation 段で実測予約。

## スコープ外(Won't)

- 実行時申告 verb・env スキップの新設(裁定2)。
- 過去 record への遡及検査(corpus は読み取り専用。FR-5 の是正は #1893 の bug fix であり遡及検査ではない)。
- degrade スコープへのガード適用。conductor 並行度上限(≤4)の機械強制。AMADEUS_USE_SWARM driver 解決の変更。
- parser 寛容化(裁定 B)。#1904(ソロ grant 不活性)の修正 — 別 intent。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-01T08:43:32Z
- **Iteration:** 1
- **Scope decision:** none

Major 1件: FR-3 の malformed 除外前提が半真(compile 経路の無音を見落とし、当該前提が Q2 裁定自体を形成)— 正前提での再裁定または射程拡張が必要。Minor 1件: :2934 off-by-one。他は7必須節・M 全数対応・裁定転記・引用・38/38 sweep 独立再現まで確認。

### Findings

- Major: FR-3 の「malformed 既 fail-closed」前提は recoverBoltDag 経路限定で、compile 経路(computeBoltDag→hook が stderr 飲む)は完全無音のまま — 射程拡張か正前提の再裁定を要す。
- Minor: requirements.md の autonomy null 行引用 :2934 は :2935 が正。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-01T08:46:04Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の Major(FR-3 前提半真)は Q2r 正前提再裁定+射程拡張+AC-3a2 で閉包、Minor(:2935)も是正。引用スポットチェック(hook swallow / if(boltDag))HEAD 一致。裁定系譜は Q2 原文保存のうえ Q2r 追補で改竄なし。指摘 0 件。

### Findings

- None
