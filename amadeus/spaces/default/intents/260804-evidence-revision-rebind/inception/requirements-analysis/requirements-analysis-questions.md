# Requirements Analysis — 質問票

対象 intent: `260804-evidence-revision-rebind`

Depth は Minimal です。主要質問はフォローアップを含めて最大4問です。

上流証拠として `business-overview`、`architecture`、`code-structure` を照合済みです。`intent-statement` と `scope-document` は本 intent の実行計画でスキップされているため、Issue #2156、Intent Mirror #2160、監査ログを要求源として用いました。`team-practices` は `amadeus/spaces/default/memory/` の規則群を参照しています。

## 回答モード

このステージの質問への回答方法を選んでください。

1. **Guide me (Recommended)** — 各質問をこのチャットで順番に確認します。
2. **Grill me** — 推奨回答も示しながら、一問ずつ深掘りして共通理解を固めます。
3. **I'll edit the file** — この質問票を直接編集して回答します。
4. **Chat** — 自由に議論し、決定事項をこちらで抽出します。
5. **Other** — 別の進め方を指定します。

[Answer]: E-ERR-MODE-1 — Guide me（ユーザー回答: 1、2026-08-04T02:42:05Z）

## Q1. 証拠から確定した恒久対策（質問撤回）

Issue #2156 と PR #2088／#2127／#2151／#2152 の反復実績により、commit SHA の到達性契約を維持し、スカッシュ着地後に main SHA へ再バインドする経路が必要だと一意に導けます。ユーザー指示に従い、既存証拠から確定できるこの問いは撤回しました。

[Answer]: E-ERR-EVIDENCE-1 — 着地後に main SHA へ再バインドする（Issue／PR実績からの執行判断）

## Q2. 着地コミットの赤と main tip の収束契約

着地 SHA はスカッシュマージ後にしか確定しないため、着地後 rebind では「着地コミット自身の t413 は赤、bot の直後の rebind コミットで緑」という1コミットの不整合窓が生じます。どの契約を受け入れ条件にしますか。

1. **main tip の自動収束を保証する (Recommended)** — 着地コミットの単発失敗は許容し、既存 GitHub App が直ちに原子的・冪等な rebind コミットを作成します。rebind 失敗は loud に残し、最新 main tip と後続コードPRを stale のまま通しません。
2. **main の全コミットで常時 green を要求する** — 不整合窓を一切許容しません。この場合、着地後 rebind だけでは成立しないため、スカッシュ不変な内容識別子などへ設計を拡張します。
3. **手動 rebind を許容する** — 自動 bot 書込みは行わず、運用者が明示的に復旧します。不整合窓の上限は保証しません。
4. **Other** — 別の整合性契約を指定します。

[Answer]: E-ERR-RULING-1 — main tip の自動収束を保証する（ユーザー回答: 1、2026-08-04T02:45:35Z）

## Q3. bootstrap provenance の潜在欠陥

`bootstrap-provenance.json` の到達不能な `postRevision` と、既に不整合な `candidate.digest`／fallback 経路を今回の修正へ含めますか。

1. **別 Issue に分離する (Recommended)** — main を止めている adoption evidence の止血と再発防止へ限定し、bootstrap provenance は独立した再現・要件で追跡します。
2. **今回あわせて修復する** — 同じ revision identity 問題として、bootstrap provenance の再バインドと fallback 復旧も受け入れ条件へ含めます。
3. **記録だけ残して修復しない** — 既知制約として文書化しますが、Issue は分けません。
4. **Other** — 別の境界を指定します。

[Answer]: E-ERR-RULING-2 — 別 Issue [#2162](https://github.com/amadeus-dlc/amadeus/issues/2162) に分離する（ユーザー回答: 1、2026-08-04T02:47:00Z）

## Redoで確定したtrust境界

旧レビューの未解決点と、[Issue #2153](https://github.com/amadeus-dlc/amadeus/issues/2153) および既存実装から確認できる事実を照合し、追加質問なしで次を確定した。

- pure rebind は、clean checkout の `HEAD` と target revision が完全一致する場合だけ許可する。
- main-only reconcile は、checkout `HEAD` と event revision が完全一致する場合だけ実行する。
- identity-only rebind は、landing commitに一意に関連付くbase=`main`・merged・merge SHA一致のPRを全ページから解決する。
- binding revision→最終PR headは3つの派生台帳を除くrecursive tree全体、最終PR head→landingは除外なしのroot tree全体が一致する場合だけ許可する。
- PR changed filesに現れないbase driftを含め、PR解決・pagination・祖先・treeのいずれかを確定できなければfail-closedとする。
- [Issue #2153](https://github.com/amadeus-dlc/amadeus/issues/2153) のfreshness path specは変更せず、identity proofのtree契約と分離する。

[Answer]: E-ERR-REDO-1 — Requirements AnalysisをModifyでRedoし、上記境界をIssue #2153の統合なしで確定した（ユーザー回答: 1、2026-08-04T03:00:41Z）

[Answer]: E-ERR-REDO-2 — Review iteration 1で検出したbase driftの抜けを、binding→PR headの非派生全tree一致とPR head→landingの全tree一致で閉じた（レビュー証拠: invocation `a2e09ff6-22b4-4d1c-ac1c-c0776f00f3db`）
