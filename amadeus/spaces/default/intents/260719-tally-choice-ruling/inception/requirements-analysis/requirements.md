# Requirements — 260719-tally-choice-ruling(Issue #1261)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

> 測定 ref: 本書の file:line・件数は observed HEAD `262a86db9`(RE 鮮度ポインタと同一)。一次資料 = `amadeus/spaces/default/codekb/amadeus/re-scans/260719-tally-choice-ruling.md`。
> business-overview.md の消費実態: 通読のうえ本文の裏付けには**不参照(N/A)** — 同文書は過去 intent の業務境界履歴で選挙 CLI への言及 0件(grep 実測)。本 intent のビジネス文脈は Issue #1261+E-GMEBT 実データ+org.md GoA 集計規則が一次資料。architecture.md(選挙 parse 資産・contrib overlay 配布境界の記述、grep 16件)と code-structure.md(scripts/ の repo ローカル層)は §2/§5 で実参照。

## 1. Intent 分析

[Issue #1261](https://github.com/amadeus-dlc/amadeus/issues/1261)(bug / P1 / S2-CRITICAL、クロスレビュー2名成立)の修正。選挙 CLI の `tally`(`scripts/amadeus-election-model.ts:321`)が choiceInternalNo 分布を裁定導出に使わず、choice 少数派の候補でも record に「裁定: 採用」を描画する。実害は実測済み — E-GMEBT で choice 2-1(不採用が多数)のところ `outcome:"adopted"` を materialize し record.md に「裁定: 採用」を誤描画(ユーザー裁定と leader 注記で手動是正)。裁定描画の正しさは P2(記録と検証は実測事実のみ)と選挙 CLI 正本宣言(election-cli-canonical)の根幹であり、S2 妥当。

原因の所在: intent 260718-election-ts-foundation の **functional-design**(選挙4類型×集計方式の対応表欠落 — "minimal tally" が GoA-only で導入され、choice を消費する集計が設計されなかった)。construction ガードレール「どのコードも消費しないフィールド」の実例(ballot は choice を受理・保存するが集計が不在)。

## 2. 現状の実測(RE 確定事実)

- `tally(_election, ballots)`(model.ts:321)— election を underscore で明示不使用。FAVOR={1,2,3,6}/AGAINST={7,8} の GoA 集計のみで `outcome` 決定(:334-335)。`TallyResult`(:312-314)に choice 内訳なし。
- 消費チェーン: 受理(:198)→ append(store.ts:161)→ **tally ★choice 脱落** → materialize(store.ts:223)→ render(record.ts:127→:107 `rulingText` は outcome 二値のみ)→ verify(election.ts:440 が tally を recompute し JSON 比較 — **修正に自動追随**)。
- Ballot.parse(:184-204)の5分類に unknown-choice なし(e4 所見、unknown-voter と対称の欠落)。
- E-GMEBT fixture: choice2:2(e2,e4)/ choice1:1(e3)、全票 GoA 2 → favor=3/against=0 → adopted 誤描画。正 = choice2「0件は不可」…ではなく当該選挙の choice 多数 = 不採用(ユーザー裁定確定)。
- テスト: `tally(` 消費テストは t234 のみ(7箇所、fixture は choiceInternalNo:1 固定)。choice 多数決の assert は全域 grep 0件。
- e2 交差: 260719-ballot-failclosed-amend が同一関数(tally 母集団 per-voter 化 E-BFARA2=A、Ballot.parse 分類追加 E-BFARA1/3=A)を編集予定 — **直列合意済み(e1 先行着地 → e2 CG 再接地)**、leader 報告済み。

## 3. 機能要件

- **FR-1(choice を裁定導出に使う)**: 【裁定待ち — Q1】勝者 choice の選出方式(単純票数 vs GoA 重み)は選挙裁定で確定する。いずれの方式でも、E-GMEBT の実データ(choice2:2/choice1:1、全票 GoA2)に適用したとき勝者 = choice2 となること(回帰の固定点)。
- **FR-2(hold 分岐の choice 軸)**: 【裁定待ち — Q2】choice tie の扱い(hold へ倒す vs GoA tie-break)は選挙裁定で確定する。既存 GoA 規則の (iii) 5×2票追加議論・(iv) 8×1票成立保留の挙動は変更しない(既存 t234 の該当テストはグリーン維持)。
- **FR-3(TallyResult 型と描画)**: 【裁定待ち — Q3】型拡張の形は選挙裁定で確定する。いずれの形でも (a) record.md の裁定行が勝者 choice を人間可読で示すこと (b) verify(:440)の recompute 比較が新形で機能すること(自動追随の実証テスト付き)。
- **FR-4(unknown-choice)**: 【裁定待ち — Q4】受理段の choice 実在照合のスコープは選挙裁定で確定する。
- **FR-5(テスト)**: (a) E-GMEBT 実データを verbatim 転写した回帰 fixture(choice が割れ全票同一賛成側 GoA)で「choice 多数 = 裁定」を assert する(現行コードでは fail する = 落ちる実証の導出元) (b) t234 の既存テストは choice 無視を前提としない範囲でグリーン維持、期待値の見直しが必要なテストは宣言のうえ更新 (c) 修正後、E-GMEBT の ledger.json 実データに対する tally が「不採用」相当を返すことを閉包実測する(fix-review-replays-origin-repro)。
- **FR-6(過去 record の扱い)**: 本修正は将来の tally 実行のみを正す。既存選挙 record の遡及再集計・書き換えは行わない(E-GMEBT は leader 注記による是正済みを正とする)。

## 4. 非機能要件

- **NFR-1(決定性)**: tally は同一 ledger に対し決定的(Date.now 等の非決定入力なし — 既存設計の維持)。
- **NFR-2(fail-closed 維持)**: 5分類ラダーの順序・既存エラー文言の後方互換を維持(e2 の分類追加との統合を壊さない)。
- **NFR-3(CI)**: typecheck / lint / tests --ci green。scripts/ は配布外(W-04、architecture.md の contrib overlay 配布境界)につき dist/promote 同期は不要 — ただし t234/t238 等 tests/ は通常 CI 対象。

## 5. 制約

- 修正面: `scripts/amadeus-election-model.ts`(tally・TallyResult・必要なら Ballot.parse)+`scripts/amadeus-election-record.ts`(rulingText 波及)+`scripts/amadeus-election.ts`(verify 波及があれば)+ tests/。配布面なし(code-structure.md: scripts/ は repo ローカル層)。
- e2 直列: e1 先行着地。e2 の touch 目録と重なる編集(tally 母集団・Ballot.parse)では e2 裁定(E-BFARA1/2/3=A)と矛盾する構造を作らない(e2 再接地コストの最小化)。
- Bolt 単一・スカッシュマージ・人間承認後 leader 執行(no-AI-merge)。

## 6. 前提

- GoA 8段の意味論(org.md gradients-of-agreement-scale)は不変 — 本 intent は「choice 軸の勝者選出」を追加するのであって GoA 規則を再定義しない。
- E-GMEBT の leader 注記・ユーザー裁定(不採用)が正であり、修正後 tally はこれを再現する。

## 7. スコープ外

- e2 管轄の受理検証(invalid-timestamp / amend / unknown-ref — #1252/#1253、E-BFARA1/3)。
- 過去選挙 record の遡及再集計(FR-6)。
- 蒸留側 GoA parse(#1254/#1257)・GoaLineCode(#1255)。

## 8. 未決事項(選挙裁定待ち)

- Q1: choice 勝者選出方式 / Q2: tie・hold 再定義 / Q3: TallyResult 型拡張形 / Q4: unknown-choice スコープ
裁定受領後、[Answer] 記入と FR-1〜FR-4 の確定文更新を行う。
