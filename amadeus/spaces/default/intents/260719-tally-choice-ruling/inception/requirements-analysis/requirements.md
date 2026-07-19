# Requirements — 260719-tally-choice-ruling(Issue #1261)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

> 測定 ref: 本書の file:line・件数は observed HEAD `262a86db9`(RE 鮮度ポインタと同一)。一次資料 = `amadeus/spaces/default/codekb/amadeus/re-scans/260719-tally-choice-ruling.md`。
> business-overview.md の消費実態: 通読のうえ本文の裏付けには**不参照(N/A)** — 同文書は過去 intent の業務境界履歴で選挙 CLI への言及 0件(grep 実測)。本 intent のビジネス文脈は Issue #1261+E-GMEBT 実データ+org.md GoA 集計規則が一次資料。architecture.md(選挙 parse 資産・contrib overlay 配布境界の記述、grep 16件)と code-structure.md は §2/§5 で実参照。
> consumes 宣言の残り3点(intent-statement / scope-document / team-practices): **N/A** — bugfix スコープの degrade により ideation 全ステージ・practices-discovery が SKIP され、当該成果物は本 intent record に存在しない(find 実測)。

## 1. Intent 分析

[Issue #1261](https://github.com/amadeus-dlc/amadeus/issues/1261)(bug / P1 / S2-CRITICAL、クロスレビュー2名成立)の修正。選挙 CLI の `tally`(`scripts/amadeus-election-model.ts:321`)が choiceInternalNo 分布を裁定導出に使わず、choice 少数派の候補でも record に「裁定: 採用」を描画する。実害は実測済み — E-GMEBT で choice 2-1(不採用が多数)のところ `outcome:"adopted"` を materialize し record.md に「裁定: 採用」を誤描画(ユーザー裁定と leader 注記で手動是正)。裁定描画の正しさは P2(記録と検証は実測事実のみ)と選挙 CLI 正本宣言(election-cli-canonical)の根幹であり、S2 妥当。

原因の所在: intent 260718-election-ts-foundation の **functional-design**(選挙4類型×集計方式の対応表欠落 — "minimal tally" が GoA-only で導入され、choice を消費する集計が設計されなかった)。construction ガードレール「どのコードも消費しないフィールド」の実例(ballot は choice を受理・保存するが集計が不在)。

## 2. 現状の実測(RE 確定事実)

- `tally(_election, ballots)`(model.ts:321)— election を underscore で明示不使用。FAVOR={1,2,3,6}/AGAINST={7,8} の GoA 集計のみで `outcome` 決定(:334-335)。`TallyResult`(:312-314)に choice 内訳なし。
- 消費チェーン: 受理(:198)→ append(store.ts:161)→ **tally ★choice 脱落** → materialize(store.ts:223)→ render(record.ts:127→:107 `rulingText` は outcome 二値のみ)→ verify(election.ts:440 が tally を recompute し JSON 比較 — **修正に自動追随**)。
- Ballot.parse(:184-204)の5分類に unknown-choice なし(e4 所見、unknown-voter と対称の欠落)。
- E-GMEBT fixture: choice2:2(e2,e4)/ choice1:1(e3)、全票 GoA 2 → favor=3/against=0 → adopted 誤描画。正 = choice2「0件は不可」…ではなく当該選挙の choice 多数 = 不採用(ユーザー裁定確定)。
- テスト: `tally(` 消費テストは t234 のみ(**8箇所・呼び出し9回** — `grep -n`=8行(:91,:102,:110,:119,:143,:146,:149,:151)/`grep -o | wc -l`=9(:119 に2呼び出し)。reviewer M1 指摘で是正、fixture は choiceInternalNo:1 固定)。choice 多数決の assert は全域 grep 0件。
- e2 交差: 260719-ballot-failclosed-amend が同一関数(tally 母集団 per-voter 化 E-BFARA2=A、Ballot.parse 分類追加 E-BFARA1/3=A)を編集予定 — **直列合意済み(e1 先行着地 → e2 CG 再接地)**、leader 報告済み。

## 3. 機能要件

- **FR-1(choice を裁定導出に使う)**: 【E-TCRRA1 裁定 = A(22:44:53Z 開票、3-0)】勝者 choice は **choice 単純票数の多数決**で決定し、GoA は成立判定の軸として分離する。**【留保転記3件(全票 GoA2、収斂要旨)】GoA 4(棄権)票の choice は勝者選出の母集団から除外する** — org GoA 規則 (v)「4 は定足数除外」の choice 軸への一貫適用。「棄権だが choice 欄は埋まっている」票の扱いを実装者判断に落とさないため、本除外を design/実装/テストで明文化する(棄権票除外の fixture を FR-5 のテストに含める)。受け入れ基準: E-GMEBT 実データ(choice2:2/choice1:1、全票 GoA2)で勝者 = choice2(回帰の固定点)。
- **FR-2(hold 分岐の choice 軸)**: 【E-TCRRA2 裁定 = A(22:45:34Z 開票、3-0、留保なし)】**choice 同数 tie は hold(人間エスカレーション)へ倒す**(正準リスト (1) 整合)。既存 hold 分岐(quorum/block/discussion)は GoA 軸のまま維持し、(iii) 5×2票追加議論・(iv) 8×1票成立保留の挙動は変更しない(既存 t234 の該当テストはグリーン維持)。
- **FR-3(TallyResult 型と描画)**: 【E-TCRRA3 裁定 = A(22:45:34Z 開票、3-0)】TallyResult は **winner(choiceInternalNo+label)+choice 別票数内訳+既存 GoaCounts** を保持し、outcome は winner から導出する。【留保転記2件】(e3, GoA2)内訳は **choice 別の単純票数のみに限定**(choice×GoA クロス分布は持たない)。(e4, GoA2)内訳の**母集団定義を design で1文固定**する — e2 intent の per-voter 最新解決(E-BFARA2=A)後の母集団を数える前提(amend 導入後に「どの票を数えたか」が内訳の意味を変えるため)。受け入れ基準: (a) record.md の裁定行が勝者 choice を人間可読で示す(具体的な表示形式 — label 併記か internalNo のみか — は functional-design で確定する明示委譲) (b) verify(election.ts:440)の recompute 比較が新形で機能する(自動追随の実証テスト付き)。なお現行の GoA 軸 tie 分岐(model.ts:334-336 `favor===against → hold reason:"tie"`)を新モデルで廃止するか残存させるかは functional-design での確定事項とする(FR-1/FR-2 導入後は GoA 単独比較が勝者決定の意味を失うため — reviewer m4 の申し送り)。
- **FR-4(unknown-choice)**: 【E-TCRRA4 裁定 = A(22:45:34Z 開票、3-0)】同一 PR で Ballot.parse に unknown-choice 分類を追加する(election.choices に実在しない choiceInternalNo を fail-closed 拒否)。【留保転記2件】(e2, GoA2)挿入位置は**「識別子の検証 → 内容の検証」の順序原則で unknown-voter 直後(識別子系)**に置く — e2 再接地時に追加する invalid-timestamp(内容側先頭、E-BFARA1)との統合を機械的にする(e2 AD の ADR-4 と同一原則)。(e4, GoA2)**スキーマコメントに分類順序の規約**(現行5分類の順序+新分類の挿入位置)を明記する。
- **FR-5(テスト)**: (a) E-GMEBT 実データを verbatim 転写した回帰 fixture(choice が割れ全票同一賛成側 GoA)で「choice 多数 = 裁定」を assert する(現行コードでは fail する = 落ちる実証の導出元) (b) t234 の既存テストは choice 無視を前提としない範囲でグリーン維持、期待値の見直しが必要なテストは宣言のうえ更新 (c) 修正後、E-GMEBT の ledger.json 実データに対する tally が「不採用」相当を返すことを閉包実測する(fix-review-replays-origin-repro)。
- **FR-6(過去 record の扱い)**: 本修正は将来の tally 実行のみを正す。既存選挙 record の遡及再集計・書き換えは行わない(E-GMEBT は leader 注記による是正済みを正とする)。

## 4. 非機能要件

- **NFR-1(決定性)**: tally は同一 ledger に対し決定的(Date.now 等の非決定入力なし — 既存設計の維持)。
- **NFR-2(fail-closed 維持)**: 5分類ラダーの順序・既存エラー文言の後方互換を維持(e2 の分類追加との統合を壊さない)。
- **NFR-3(CI)**: typecheck / lint / tests --ci green。scripts/ は配布外(W-04、architecture.md の contrib overlay 配布境界)につき dist/promote 同期は不要 — ただし t234/t238 等 tests/ は通常 CI 対象。

## 5. 制約

- 修正面: `scripts/amadeus-election-model.ts`(tally・TallyResult・Ballot.parse の unknown-choice)+`scripts/amadeus-election-record.ts`(rulingText 波及)+`scripts/amadeus-election.ts`(verify 波及があれば)+ tests/。配布面なし(code-structure.md:427 verbatim「**`scripts/` と `tests/` は dist へ一切コピーされない**」)。
- e2 直列: e1 先行着地。e2 の touch 目録と重なる編集(tally 母集団・Ballot.parse)では e2 裁定(E-BFARA1/2/3=A)と矛盾する構造を作らない(e2 再接地コストの最小化)。
- Bolt 単一・スカッシュマージ・人間承認後 leader 執行(no-AI-merge)。

## 6. 前提

- GoA 8段の意味論(org.md gradients-of-agreement-scale)は不変 — 本 intent は「choice 軸の勝者選出」を追加するのであって GoA 規則を再定義しない。
- E-GMEBT の leader 注記・ユーザー裁定(不採用)が正であり、修正後 tally はこれを再現する。

## 7. スコープ外

- e2 管轄の受理検証(invalid-timestamp / amend / unknown-ref — #1252/#1253、E-BFARA1/3)。
- 過去選挙 record の遡及再集計(FR-6)。
- 蒸留側 GoA parse(#1254/#1257)・GoaLineCode(#1255)。

## 8. 未決事項

なし — Q1〜Q4 は E-TCRRA1〜4(2026-07-19 開票、各 3-0 採用)で全て裁定済み。留保7件(Q1×3 / Q3×2 / Q4×2)は questions の [Answer] と FR-1/FR-3/FR-4 へ転記済み。
