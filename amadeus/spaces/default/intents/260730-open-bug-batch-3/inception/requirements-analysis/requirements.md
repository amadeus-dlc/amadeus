# Requirements — 260730-open-bug-batch-3

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — いずれも RE 差分リフレッシュ(base a38a1f4d3 → observed 3f73823b1)の成果物。本書の機序引用は architecture.md の「260730-open-bug-batch-3 focus」節、患部配置は code-structure.md の同節、利用者影響の枠組みは business-overview.md の同節に依拠する。file:line は observed 3f73823b1 断面。

## 承認系譜

- Intent 起動: ユーザー指示「このバグまとめて、インテントで対応してほしい」(2026-07-31、対象 = open bug ラベル3件)。クロスレビュー2名成立を3件とも確認済み(#1773/#1772 = CONFIRMED_WITH_REFINEMENTS ×2、#1752 = CONFIRMED ×2)。
- 仕様裁定: requirements-analysis-questions.md の Q1=A(格納分離)/ Q2=A(description+question)/ Q3=A(receipt 存在判定)— ユーザー直接裁定、承認 2026-07-31T00:09:17Z。

## Intent 分析

3件はいずれも「機構が自らの設計意図を破る」クラスの欠陥である: 選挙機構が blind 独立性(自らの中核保証)を格納面から破る(#1773)、選挙 CLI が投票判断に必要な本文を運べない(#1772)、mirror boundary が自らの指示どおりの操作列を拒否する(#1752)。目標は各機構の文書化済み意図への回復であり、新機能の追加ではない。1 Issue = 1 Bolt = 1 PR の境界で修正する。

## 機能要件

### FR-1: #1773 — 未開票票の格納分離(裁定 Q1=A)

**現状機序**: `packages/framework/core/tools/amadeus-election-store.ts` の `appendBallot`(:464-465)が受理票を即座に共有ファイル `ledger.json` へ全文(`goa`/`reservation`/`rationale` — `amadeus-election-model.ts:134-136`)で書く。blind lift(`materialize` :498-518)は tally 時のみ。`ledger.json` は git tracked のため、未投票 voter は(a)ハーネスのファイル変更通知(b)`git status`/`git diff` の2経路で先行票本文に到達しうる。

- **FR-1a**: `collecting` 状態の間、受理済み票の本文(choice・GoA・reservation・rationale)は voter 別の一時格納(例 `pending/<voter>.json`)に置き、`ledger.json` へは書かない。一時格納は gitignored とする。
- **FR-1b**: tally 遷移時に全一時格納票を `ledger.json` へ統合してから集計する。統合は決定的(voter 名順など)で、late lane(`:453-462`)の意味論を保存する。
- **FR-1c**: `status` verb の戻り(`{voted, pending, state}` — store :485-496)と `vote` verb の受理出力(`{"accepted": <voter>}`)は不変(この配布面は健全 — 変更しない)。
- **FR-1d**: `timeline.json` の投票受理イベント(`:467-472`)は本 intent では現状維持(投票済み者名の可視化は本文露出ではない)。変更する場合は逸脱として停止。

**受け入れ基準**:
1. リグレッションテスト(Red→Green): collecting 中に他 voter が受理された状態で、`ledger.json` に票本文が存在しないことを assert する(欠陥注入 = 現行実装では票本文が載るため Red になる)。
2. 一時格納パスが `.gitignore` に整合し、collecting 中の `git status --porcelain` に票本文ファイルが untracked/tracked いずれとしても現れないこと(gitignored の実測)。
3. tally 後の `ledger.json`・`tally.json`・`record.md` は既存様式と同一(既存 t234 系・store 系テストがグリーン維持)。
4. 免責項なし: 「検証不能」の明示は基準充足を代替しない。

### FR-2: #1772 — Choice 本文と設問文の搬送(裁定 Q2=A)

**現状機序**: `amadeus-election-model.ts:48` `export type Choice = { internalNo: number; label: string };`、`parseChoices`(:79-80)がホワイトリスト再構成で `description` を無音 drop(exit 0 の fail-open)。`DistributionView`(:306-310)には `question` も無く、notify は `viewPath` のみ渡す(`amadeus-election.ts:401-403`)ため投票者は設問文を受け取らない。

- **FR-2a**: `Choice` に本文フィールド `description`(任意、string)を追加し、定義 JSON の `choices[].description` を parse で保持する。
- **FR-2b**: `DistributionView` に `question`(設問文)と choice ごとの `description` を同梱する。
- **FR-2c**: **BR-2 契約の明示改訂**(pinned-behavior ruling): `tests/unit/t234-election-model.test.ts:190-192` のキー集合 verbatim assert と `amadeus-election-model.ts:304-305` の設計コメント「Structurally blind: exactly these fields exist — no recommendation marker, no prior votes, no peer status (BR-2 pins the key set)」を、新キー集合(`question`/`description` を含む)へ改訂する。BR-2 の中核禁止(推薦マーカー・先行票・peer status の不搬送)は不変とし、コメントにその旨を明記する。
- **FR-2d**: record render(`amadeus-election-record.ts`)・tally の `choiceCounts`(:485-496)は label 主表記を維持(description の転記は任意。GoA 行様式と干渉しないこと)。

**受け入れ基準**:
1. リグレッションテスト(Red→Green): `description` 付き定義 JSON で `open` → `views/<voter>.json` に `description` と `question` が存在することを assert(現行では drop されるため Red)。
2. 改訂後の t234 キー集合 assert が新契約を固定し、推薦マーカー・先行票・peer status が view に現れないことの assert を維持する。
3. `description` 無しの既存定義 JSON は従来どおり受理される(後方互換ではなく任意フィールドの意味論 — description 不在の view は description キーを持たないか null、いずれかを契約としてテストで固定)。

### FR-3: #1752 — mirror boundary report create の自己矛盾解消(裁定 Q3=A)

**現状機序**: `packages/framework/core/tools/amadeus-orchestrate.ts:4252-4256` の拒否条件のうち患部節 :4255 `(answer === "create" && hasMirrorIssue)` が、report 実行時点の state 再評価(:4241-4242 `mirrorIssueNumberFromDocument(stateContent)`)に基づくため、ask の指示(:519-529 — 先に mirror コマンドを実行してから report せよ)に従って manual create を成功させると自分の成功が拒否条件になる。#1791 の `intent-initialized` boundary 着地後も prompt モード経路(:486-500、:488 の降格)では再現が温存されている。

- **FR-3a**: report `--user-input create` の受理判定を「create 実行の証拠 = mirror receipt(operation が create かつ succeeded — `classifyReceipt`(`amadeus-mirror-policy.ts:114-127`)の語彙)が存在すること」に変更する。receipt が存在すれば `hasMirrorIssue` が true でも受理し、boundary receipt を completed へ記録する。
- **FR-3b**: create コマンド未実行(create receipt 不在)の report create は従来どおり拒否する(受入条件の維持)。ask 時点で既に Mirror Issue があった場合(includeCreate=false で create を提示していない)も、create receipt が無い限り拒否される — この2ケースの区別を fixture で分離する。
- **FR-3c**: `--instance` はユーザー任意の invocation id のため、instance 一致での照合は行わない(receipt の operation/status での判定)。
- **FR-3d**: sync/skip の照合なし非対称は本 intent では現状維持(裁定 Q3=A の範囲)。証拠化の拡張が必要なら別 Issue に記録する。

**受け入れ基準**:
1. リグレッションテスト(Red→Green): Issue 起票時の再現列 — prompt モード・Mirror Issue 未記録・initial-create receipt absent の state で ask → manual create 成功を模した state(Issue 番号記録+create receipt succeeded)→ report create が受理され receipt が completed になること(現行では拒否されるため Red)。
2. `tests/integration/t265-engine-boundary.integration.test.ts:793` の "unoffered create" fixture を「ask 時点で既に Issue あり・create receipt 無し」に精密化し、拒否の維持を assert。create receipt 有りの新 fixture で受理を assert(2ケースの分離)。
3. 既存 t265 の grid assert(:567-590 — `Choose create` の出現条件)と sync 正常系(:758-772)はグリーン維持。
4. #1791 の初回 create 経路(t371)はグリーン維持(分岐が別であることの確認)。

## 非機能要件

- **NFR-1**: 全対象は `packages/framework/core/` を正本として編集し、`bun scripts/package.ts` + `bun run promote:self` で全配布面を同一変更で同期する(#1773/#1772/#1752 の患部行はいずれも13面に存在 — RE 実測)。`bun run dist:check` / `bun run promote:self:check` グリーン必須。
- **NFR-2**: 検証ゲート: `bun run typecheck`、`bun run lint`、`bash tests/run-tests.sh --ci` 相当の関連スイート、coverage patch ゲート(push 前ローカル lcov で diff 追加行未カバー0)、complexity ゲート。
- **NFR-3**: TDD 既定(cid:code-generation:tdd-default-with-narrow-exceptions): 各 FR は合意済み公開 seam への失敗テスト1件の Red 実測 → 最小実装で Green の vertical slice で実装する。
- **NFR-4**: 新規テストの採番は t371 より後(区間内で t366/t367/t368 の番号重複を実測済み)。テスト引用はフルパスで書く。

## 制約

- 1 Issue = 1 Bolt = 1 PR。#1752 は完全非交差で先行着地可。#1773×#1772 は `amadeus-election-model.ts` で交差するため、直列化するか着手前に実 diff で行レンジ非交差を確認してから並行させる(cid:reverse-engineering:free_text_1 / c6)。
- 要求されていない後方互換レイヤー・シムを追加しない(org Forbidden)。FR-2 の「description 任意」は互換シムではなくフィールドの意味論。
- 実装が本要件・設計から逸脱する必要に気づいたら実装前に停止し裁定を仰ぐ(cid:requirements-analysis:implementation-deviation-election)。

## 前提

- ソロモード(auto-solo-election: true)。§13 選定・設計逸脱・ブロッカーは auto-solo 選挙、仕様変更はユーザー専権。
- 3件の欠陥現存は RE で Developer/Architect の2段独立実測により確定済み(observed 3f73823b1)。

## スコープ外

- #1772 の空 label 拒否・未知フィールド fail-closed 化(同根ファミリだが Issue 字義外 — 必要なら別 Issue)。
- #1773 の timeline.json 投票済み者可視の変更(FR-1d)。
- #1752 の sync/skip 証拠化(FR-3d)。
- 選挙開票タイミングの裁量(即時開票 vs 猶予 — #1772 コメントの二次影響記録。別判断)。

## 未解決事項(後続ステージへ)

- FR-1a の一時格納の具体配置(`pending/` サブディレクトリ名・ファイル様式)は code-generation の設計判断(既存 store 様式に合わせる)。
- FR-2b の view キー命名(`description` の位置 — ordered 配列内 vs choices 併記)は実装時に既存 view 構造へ整合させる。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-31T00:14:55Z
- **Iteration:** 1
- **Scope decision:** none

FR/AC はテスト可能で裁定転記も整合しており、軽微な引用未検証点のみ残る(conductor が HEAD 裏取り済み)。

### Findings

- [Minor] FR-1c/FR-2b/FR-3a の file:line は codekb 断面に行番号粒度の裏付けなし — conductor が HEAD 直読で実在確認済み(status :485 / notify viewPath :401-403 / classifyReceipt :114)
- [Minor] FR-1b の late lane 引用 :453-462 は codekb の :453-454 よりやや広いレンジ(許容範囲・精密化の余地)
