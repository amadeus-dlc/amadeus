# Code Generation Plan — sensor-docs-sync(#3097)

方式 = D3 + クロスレビュー refinement(値照合述語が必須、06 側の陳腐値も対象)。traceability: 全 step → FR-SEN-1/2。depth Minimal。クロスレビュー成立済み(ESTABLISHED_WITH_REFINEMENTS)。

- [x] Step 1: TDD Red — t3028 を拡張: (a) 07 en/ja の matches 表を検査対象へ追加(期待集合 = `derivedCorpus()` の matches 宣言サブセット 13 件 — 第 2 コーパス定義を作らない) (b) **名前集合だけでなく matches 値の一致まで照合する述語**(refinement: 既存 `tableRows()` は名前のみで値陳腐化を検出できない)。拡張後の Red を実測(現行 07 は欠落 4 + 陳腐 2)(FR-SEN-2)
- [x] Step 2: `docs/reference/07-sensor-system.md:199-207` / `.ja.md` の表を 13 件へ同期(欠落 4 行追加 + `amadeus-required-sections` / `amadeus-upstream-coverage` の 2 行へ `codekb` glob 是正)。en/ja 同一変更(FR-SEN-1)→ Step 1 が Green
- [x] Step 3: 06 側の陳腐値(reviewer-2 実測: `docs/harness-engineering/06-sensors.md` en:80 / ja:45 に同一の `codekb` 欠落)を再実測のうえ是正し、値照合の射程に 06 の該当面を含められるか確認(含められない構造なら根拠を code-summary へ記録)
- [x] Step 4: 落ちる実証 — 07 の表 1 行を注入的に崩して Red 実測 → revert(競合マーカー・残渣ゼロを機械確認)→ 同期後 Green(FR-SEN-2 AC)
- [x] Step 5: 台帳 resync(t3028 変更 → coverage-registry regen 要否確認)
- [x] Step 6: typecheck / lint / t3028 → commit → push → PR 作成(push-first)

申し送り(スコープ外): git-drift の PostToolUse 非発火仮説(`amadeus-sensor-fire.ts:225`)は別トリアージ候補(§13 / 完了時に起票判断)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T16:06:24Z
- **Iteration:** 1
- **Scope decision:** none

3成果物(plan/summary/report)はFR-SEN-1/FR-SEN-2の受け入れ確認と1対1で対応し、値照合述語の実装・落ちる実証(注入→Red→revert→残渣ゼロ機械確認)・en/ja同期・06側陳腐値是正のいずれもrequirements.md/unit-of-work.mdと整合する。06をvalue-matching射程外とした構造的理由もStep3の指示通りcode-summary.mdへ記録済みで無申告逸脱は検出されなかった。head SHAの不一致、plan未チェック、07スキーマ例追補のrequirements.md側追跡漏れの3点をFOLLOW-UPとして記録するが、BLOCKERは検出されなかった。

### Findings

- FOLLOW-UP | code-summary.mdはheadを`a013a5bd2`と記載するが、同時に読んだpr-convergence-report.mdのlocal/remote/pr headはいずれも`58e7e0997228109a5549306123afeb5f8d94362f`で一致しない。record checkpoint同梱コミット等による正当な後続コミットの可能性が高く(team.mdのrecord checkpoint同梱ノルムに整合)、conductor統合断面での再実測(t3028 11 pass/0 fail、build exit 0)も別途確認されているため実質的な検証ギャップとは判断しないが、code-summary.md単体では『報告済みexit codeがどのcommitに対応するか』を追跡できない。次回更新時に最終headへ同期するか、差異理由(record checkpoint同梱)を明記されたい。
- FOLLOW-UP | code-generation-plan.mdのStep 1〜6が全て`- [ ]`のまま未チェック。stage契約Step 4『Instructions to execute each plan step sequentially and mark checkboxes as completed』に反する。code-summary.mdからは全ステップ完了(Green・PR作成済み)が読み取れるが、plan側のチェック状態がそれを反映しておらず、plan⇔summary間のトレーサビリティが一段階分欠落している。
- FOLLOW-UP | code-summary.mdは07-sensor-system.mdのスキーマ例2行是正を『追補、E-AD-528D74AF』として開示しているが、この追補がrequirements.mdのOut of scope節が明示除外する『07-sensor-system.mdの例示表・散文列挙(:48-49, :380-386)の書き換え』と同一箇所に触れる可能性がある(実ファイルは本レビュースコープ外のため断定不可)。梯子裁定IDの開示自体はP3(逸脱の裁定ルーティング)を満たすが、requirements.md側には#2162再束縛時と同様の『修正履歴』注記が付いておらず、requirements.md単体からはこのscope拡張を追跡できない。整合性のためrequirements.mdにも簡潔な参照注記の追加を推奨する。
