# Requirements Analysis — 質問票

**上流入力(consumes 全数)**: `intent-statement`(Q1〜Q9 の判定基準となるユーザー既決 Q1〜Q4 と申し送り R-1〜R-5 の正本 — 本票の全 [Answer] の導出元)/ `scope-document`(In/Out 境界 — Q1/Q3 の「別 Issue」導出と Q6/Q7 の委譲範囲の根拠)/ codekb `business-overview`(監査成立という目的 — Q8 で ad-hoc 名を警告対象とする価値判断の背景)/ codekb `architecture`(subagent 観測パイプラインの hook seam 構成 — Q4/Q5 の供給経路判定の出典)/ codekb `code-structure`(集計 seam と registry の構造 — Q9 の COMPLETED 単独判定の出典)

- **Intent**: `260805-subagent-type-guard` / **Stage**: requirements-analysis (2.3)
- **Depth**: Standard / **Mode**: 自律実行(intent autonomy `full`、grant `intent-grant-1d65f71b8d4710faa7f46e0b033b7dc8`)
- **測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`(RE record `re-scans/260805-subagent-type-guard.md` と同一断面)

## 運用宣言(E-OC1 証跡)

RE が送付した裁定候補 Q1〜Q9 について、本ステージは**新規のユーザー質問を発行しない**。
判定: 各問は (i) intent-capture でのユーザー既決(Q1〜Q4、承認 2026-08-05T13:33:00Z / 13:40:00Z)と
RE の一次証拠から**一意に導出できる執行クラス**(`cid:requirements-analysis:always-elect` の選挙不要枝)か、
(ii) 要件では確定せず **application-design へ明示委譲する設計判断**のいずれかに分類され、
真に未決のユーザー裁定事項は残らない。グラントによる内容裁定の代答は行っていない
(`cid:approval-handoff:c2-grant-gates-only` — 以下の各 [Answer] は「代答」ではなく既決・実測からの機械的導出である)。
選挙不要判定の承認: 自律実行(grant 上記)下の執行分類として記録、2026-08-05T16:20:00Z。

## RE 裁定候補の処理(Q1〜Q9)

### Q1. D-1(tool_name "Agent" 不一致)を本 intent で直すか

[Answer]: 別 Issue(#2303、起票済み)とする — 執行クラス。導出: intent-capture Q4=C のユーザー裁定は同種の start seam 欠陥(D-2/#2297)を「別 Issue、ガードは両記録面に置き配線回復後に start 側でも発火」と確定しており、D-1 は同じ構造(start seam を殺す独立欠陥)のためこの裁定が一意に適用される。ガード実装(FR-2)は D-1/D-2 に依存しない(completed 側で必ず発火し、start 側は両欠陥の修正後に発火し始める)。承認: 既決 Q4=C(2026-08-05T13:40:00Z)の機械的適用、分類記録 2026-08-05T16:20:00Z。

### Q2. D-1 の修正形(集合化 / 置換 / subagent_type 実在判定)

[Answer]: 本 intent の要件対象外 — #2303 の requirements で扱う(Q1 の帰結)。承認: 同上。

### Q3. D-2(settings.json の PreToolUse 不在)を本 intent で直すか

[Answer]: 別 Issue(#2297、起票済み)— intent-capture Q4=C のユーザー既決そのもの。承認: 既決(2026-08-05T13:40:00Z)。

### Q4. 実効 model の解決範囲

[Answer]: intent-capture Q3=D(解決順で決まる範囲を記録、解決不能は欠落明示、載せられる範囲は RE 実測に従う)の執行として、**承認済みの順序(明示指定 > persona ピン > セッション継承)を逐語で維持**する。RE 実測により ③セッション継承は取得不能(runtime-attrs.json は observability 未設定・実体不在・読み手0件・別プロセス)→ 欠落明示に落ちる。①明示指定(`tool_input.model`、明示時のみ)と ②persona ピン(opus 9 / sonnet 5)は取得可能 → 記録対象。**ハーネス供給値(Codex payload `model`)を順序のどこに置くかは承認済み裁定の文面に無い新層 = 設計判断であり、執行として決めず application-design へ委譲する**(reviewer i1 BLOCKER の是正 — 初稿は供給値を最上位へ挿入しており、既決の再解釈に当たるため撤回した)。承認: 既決 Q3=D(2026-08-05T13:40:00Z)の逐語適用、是正記録 2026-08-05T16:50:00Z。

### Q5. ハーネス別の model 供給差の扱い

[Answer]: ハーネス別供給差(C10 裁定)は事実として requirements の Assumptions(AS-1〜AS-3)と FR-3a に反映するが、**供給値と明示指定・ピンの優先関係は Q4 と同じく application-design へ委譲**する(是正: 初稿の「(a) 供給値優先が一意」は設計判断の混入だった)。委譲の pre-approved 分岐: どちらの解でも欠落明示と CON-3 の fail-open は不変。是正記録 2026-08-05T16:50:00Z。

### Q6. model 属性の記録先(audit optional 属性 / gen_ai.request.model / 両方)

[Answer]: 要件は「SUBAGENT イベントの optional 属性として記録され、audit から集計可能」までを固定し(FR-3b)、otel resource key(`gen_ai.request.model` — 宣言済み・本番供給0の休眠キー)への同時供給の要否は **application-design へ委譲**(pre-approved 分岐: 導入する場合も CON-3 の fail-open を守る)。承認: 委譲の分類記録 2026-08-05T16:20:00Z。

### Q7. 許可集合の組込型部分の正本

[Answer]: 要件は「許可集合は機械導出可能で、組込型は count-free の台帳として保守され、ケーシング差(`Explore` vs `explore`)を明示的に扱う」までを固定し(FR-1b)、台帳の形式・置き場所・正規化写像は **application-design へ委譲**。承認: 同上。

### Q8. `name:` 値が Agent Type に入る機序

[Answer]: 機序の確定は要件に不要 — どの seam 由来であれ `name:` 値は許可集合外であり FR-2 の警告対象(これが検出の本丸: 実測 184 distinct / 261 イベント)。機序の live 追試(name: 指定 probe)は application-design の設計入力として任意実施に留める。承認: RE 一次証拠からの一意導出、分類記録 2026-08-05T16:20:00Z。

### Q9. CAP-3 の入力(lifetime ペア / COMPLETED 単独)

[Answer]: COMPLETED 単独で動作することを必須とし(STARTED は Claude Code で0件 — D-1/D-2 未修正でも集計が空にならない)、STARTED が存在する場合の併記は許容 — RE 実測(60 vs 974)からの一意導出。`composeSubagentLifetimes`(休眠 seam)の採用可否は application-design へ委譲。承認: 同上。

## 追加質問

なし(6次元の完全性分析で material な未決はユーザー裁定事項に残らない — 残余はすべて上記の AD 委譲として requirements.md の Open questions 節に固定)。
