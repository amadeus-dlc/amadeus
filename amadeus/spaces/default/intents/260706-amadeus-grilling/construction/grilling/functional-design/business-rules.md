# Business Rules — Amadeus Grilling 統合

**Intent**: Amadeus Grilling 統合 / **Stage**: functional-design (3.1)
**Upstream**: `../../inception/requirements-analysis/requirements.md` の FR/NFR を実装可能な規則に落とす。grilling-protocol.md(新設)にそのまま転記できる粒度で書く。

## 対話規律(BR-D: Discipline)

| # | 規則 | 由来 |
|---|---|---|
| BR-D1 | 質問は常に1問ずつ提示する。1回の構造化質問呼び出しに複数質問を同梱しない | FR-1.2 / 元スキル「Asking multiple questions at once is bewildering」 |
| BR-D2 | すべての質問に推奨回答を添える: 質問文に推奨の根拠を1〜2文で述べ、先頭選択肢のラベルに「(推奨)」を明記する | FR-1.3 |
| BR-D3 | コードベース・成果物・codekb から確定できる事実はユーザーに問わない。エージェントが調査して解決する | FR-1.4 / 元スキル「If a fact can be found by exploring the codebase, look it up」 |
| BR-D4 | 自己調査で確定できない事実は推定(確度: high/medium/low)として提示し確認を求める。ユーザーが不同意なら通常の判断質問に降格する | FR-1.4 |
| BR-D5 | 判断(decisions)は必ずユーザーに問う。エージェントが代行しない | 元スキル「The decisions are mine」/ AUTONOMY IS NEVER INFERRED |
| BR-D6 | depth 目安(stage-protocol §3 の既存契約: Minimal ~2-4 / Standard ~5-8 / Comprehensive ~8-12+)に達したら継続確認を提示する。ユーザーは「続けて」で延長、任意時点の「done」で打ち切りできる | FR-1.6 |
| BR-D7 | 終了時は必ず全決定事項の合意サマリを提示し、明示確認を得る。確認前に成果物生成・終了処理へ遷移しない。修正要求は該当回答を更新してサマリを再提示する | FR-1.7 / 元スキル「Do not enact the plan until I confirm」 |

## ワークフロー統合規則(BR-W: Workflow — Grill me モードのみ)

| # | 規則 | 由来 |
|---|---|---|
| BR-W1 | Grill me は第4の対話モードとしてモード選択に常に表示する(表示位置は frontend-components C-1 の規定に従い Guide me 直後 — 対話系→ファイル系→自由系の並び)。Construction / Operation フェーズでは説明文に「例外的な利用」の注記を含める | FR-1.1 |
| BR-W2 | 動的生成した質問は、提示する**前に**質問ファイルへ空 `[Answer]:` タグつきで追記する(Stop フックの human-wait 判別規約の継承) | FR-1.5 |
| BR-W3 | 回答は受理直後に `[Answer]:` へ書き戻す。書き戻し前に次の質問を提示しない | FR-1.5 |
| BR-W4 | 監査は既存契約: 提示前に `decision`(DECISION_RECORDED)、回答後に `answer`(QUESTION_ANSWERED)を**1問ごと**に記録する。新イベント型は追加しない | FR-3.1, FR-3.2 / OQ-2 検証済み |
| BR-W5 | モード共通の後段(Step 4 の全 [Answer]: 充足検証、矛盾分析、ステージ成果物生成、§13、承認ゲート)は既存プロトコルのまま適用される — grilling は Step 3 の対話部分のみを置き換える | NFR-3 |

## スタンドアロン規則(BR-S: Standalone — /amadeus-grilling のみ)

| # | 規則 | 由来 |
|---|---|---|
| BR-S1 | `user-invocable: true` / `classification: read-only`。ワークフローのステージポインタを進めず、監査イベントを発しない | FR-2.1 |
| BR-S2 | 対象は引数で指定(ファイルパスまたはテーマ)。引数なしの場合は対象を最初の1問として確認する | FR-2.2 |
| BR-S3 | 出力は端末のみ。ユーザーが保存先を明示要求したときに限り、合意サマリをそのパスへ書き出す | FR-2.3 |
| BR-S4 | 対話規律 BR-D1〜D7 をすべて適用する(質問ファイル・監査の義務のみ免除) | FR-2.2 |

## 配布・帰属規則(BR-P: Packaging)

| # | 規則 | 由来 |
|---|---|---|
| BR-P1 | 規律の単一ソースは `amadeus-common/protocols/grilling-protocol.md`。stage-protocol Step 3d とスキルはこれを参照し、規律を二重定義しない | 設計判断(business-logic-model) |
| BR-P2 | grilling-protocol.md の先頭に MIT 帰属コメント(mattpocock/skills の URL・原ライセンス)を置く。docs にクレジットを記載する | FR-4.1 |
| BR-P3 | スキルは `core/skills/amadeus-grilling/` に置く。配布はハーネスごとに経路が異なる: **claude / kiro / kiro-ide** → 各 manifest の coreDirs に `{ src: "skills/amadeus-grilling", dst: "skills/amadeus-grilling" }` を追加。**codex** → manifest ではなく `harness/codex/emit.ts` のセッションスキル配列(L337 付近の `["amadeus-session-cost", ...]`)に `"amadeus-grilling"` を追加(codex のスキルは emit() が `.agents/skills/` へ合成する — manifest 行では発見されない)。build-and-test の存在確認は claude/kiro/kiro-ide は `dist/<h>/<dir>/skills/amadeus-grilling/`、**codex は `dist/codex/.agents/skills/amadeus-grilling/`** を見る。※上流 requirements FR-2.4 の合否基準は「4ハーネスの manifest に配布行」と読める記述だったが、codex の実配布経路(emit.ts)に合わせて本設計で上書きする(逸脱の由来: architecture-reviewer 指摘[1]、RE 負債シグナル#3) | FR-2.4 / RE 負債シグナル#3 |
| BR-P4 | ハーネス固有の記述は question-rendering annex にのみ許す(今回は annex 変更なし — OQ-1 検証済み)。protocols/ とスキルはハーネス中立に書き、パスは {{HARNESS_DIR}} トークンを使う | NFR-2 |
| BR-P5 | バージョンバンプ3点セット+CHANGELOG、docs 更新(対話モード節、session skills 列挙箇所)を同一コミットで行う | FR-4.2, FR-4.3 |

## 矛盾チェック

- BR-W1(常時表示)と Construction の「質問は例外的」ガイドライン → 注記で解消(要件 Q4 決定)。
- BR-D6(depth 目安)と BR-D7(必ず確認)→ 競合しない: 目安は「いつ確認を挟むか」、確認は「どう終わるか」。
- BR-S1(read-only)と BR-S3(書き出し)→ outcomes-pack と同じ「明示要求時のみ書く」例外型として整合(requirements Q5 決定)。
- 未解決の矛盾なし。
