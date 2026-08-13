上流入力(consumes 全数): business-overview.md / architecture.md / code-structure.md

# Requirements Analysis 明確化質問 — 260811-allowlist-semantic-audit

## 裁定の記録

- Intent autonomy: `full`(grant `intent-grant-f89fccc696a7e06975c1d7d0b7ef8343`)
- 決定経路: `amadeus-bolt decide-question` の5段梯子(`cid:scope-definition:c1-semi-ladder-routing`)。人間へ直接提示しない
- 各問の裁定 ID・decider・reviewState は下記 [Answer] 行に記録する
- グラント承認: 2026-08-11T13:31:00Z(`amadeus-bolt set-autonomy --mode full --confirmed-display-digest sha256:e7f5b8e7…b50a479f`、実 HUMAN_TURN による display digest 確認を経て発行)
- 裁定承認: 2026-08-11T14:35:00Z(Q1〜Q4 を上記グラントの下で `decide-question` が裁定。全問 `decider: agent-recommendation` / `reviewState: unreviewed` — solo-election の native 結果が無いため loud degradation が記録済み。後日 `amadeus-bolt review-auto-decision` でレビュー可能)

## 前提(RE で確定済み — 再質問しない)

`codekb/amadeus/re-scans/260811-allowlist-semantic-audit.md` が正本。要点のみ再掲する。

- `tests/.coverage-patch-allowlist.json` は **623 エントリ / 106 ファイル**。全件が意味的セレクタ(`function` + `fingerprint` + `anchorLines` + `targetLines`)で、**解決失敗は 0 件**
- `resolveSemanticSelector`(`tests/coverage-patch-gate.ts:288-313`)は解決を fail-closed にするが、`findStaleAllowlistEntries`(`:407-419`)は `reason` を引数に取らず、免除の正当性を判定する段はパイプラインのどこにも存在しない
- **確定転位 18 件**(下限)。転位はエントリ単位で混在し、同一ファイル・同一 `reason` 文字列の群でも一致と転位が並存する
- `reason` が識別子を名指すのは 125 件のみ。うち機械サーベイの候補が 51 件(未判定 43 件)。残る 498 件は述語の射程外
- **45 件は選言型 boilerplate**(「defensive, type-only, or spawned-boundary path」20 件 / 「Residual defensive, invalid-input, replay, or process-boundary」25 件)で、特定の構文クラスを主張しておらず**構造的に反証不能**
- 意味整合を検査するテスト・ガードは **0 件**

## 執行として確定した事項(質問にしない)

判断を要さず、一次証拠から一意に導かれるため執行として処理した(`cid:requirements-analysis:always-elect` の執行クラス、`cid:intent-capture:c1`)。`decide-question` の裁定 ID は監査に残る。

- **`expiry` 面はスコープ外** — Issue #1622 本文が求めるのは「`reason` と現行行内容」の照合であり `expiry` を含まない。RE も `expiry` 面を UNMEASURED-1 として明示的に射程外に置いた。別 Issue へ分離する(裁定 ID `auto-decision-f50811841ad28b148d18a255c5ecd1c9`)
- **#2162 との分離を維持** — 本 intent は #1622 を対象として birth されており、別 Issue の取り込みはスコープ拡大にあたる。着手対象の決定は利用者の専権(`cid:requirements-analysis:issue-selection-user-decides`)(裁定 ID `auto-decision-fb73794c1ee7a5cf9ea169679137a5ce`)

## 質問

### Q1: 本 intent の是正対象範囲

台帳 623 件のうち、どこまでを本 intent で是正するか。

- A. RE が確定させた 18 件のみを是正し、全数照合は行わない(最小・確実)
- B. 18 件 + 機械サーベイ候補の未判定 43 件を adjudicate し、確定分を是正する(中間)
- C. 623 件全数を照合して是正する(完全だが、498 件は述語の射程外で人手判断になる)
- D. 是正は行わず、検出ガードの新設のみを本 intent のスコープとする
- X. Other (please specify)

[Answer]: C — 全 623 件の照合(E-code: auto-decision-9695cab24cbfe3b0f95ee54e5d9f2d28、decider: agent-recommendation、reviewState: unreviewed)。Issue #1622 本文の明示要求どおり全数を対象とし、スコープ縮小は行わない

### Q2: 転位エントリの是正方式

転位したエントリをどう直すか。`reason` が説明している対象と、セレクタが指している対象のどちらを正とするか。

- A. `reason` を正とし、セレクタを `reason` が説明する真の対象へ張り直す(免除の意図を保存する)
- B. セレクタを正とし、`reason` を現在の解決先の実態に合わせて書き換える(現在の免除範囲を保存する)
- C. ケースごとに判定する — 真の対象が免除に値するなら A、値しないならエントリ削除
- X. Other (please specify)

[Answer]: C — ケースごとに判定(E-code: auto-decision-3690a7b0bdf8f3a9dea47d4fb6dd10e9、decider: agent-recommendation、reviewState: unreviewed)

### Q3: 反証不能な reason(選言型 boilerplate 45 件)の扱い

「defensive, type-only, or spawned-boundary path」のように複数の可能性を `or` で並べた `reason` は、どの機械述語でも真偽を決められない。

- A. 本 intent では手を付けない(別 Issue へ分離)
- B. `reason` の記述規約(単一の構文クラスを主張すること)を定め、45 件を規約準拠へ書き換える
- C. 規約は定めるが書き換えは新規エントリのみに適用し、既存 45 件は現状維持とする
- X. Other (please specify)

[Answer]: B — 記述規約を定め 45 件を規約準拠へ書き換える(E-code: auto-decision-7a583564a2aa9f23e20334618fb15a5c、decider: agent-recommendation、reviewState: unreviewed)

### Q4: 検出ガードの新設と CI 配線

再発防止の機械ガードを本 intent で入れるか。

- A. 入れる。`reason` が名指す関数名とセレクタの `function` フィールドの照合(RE で確定 18 件すべてを捕捉できた述語)を最小ガードとして新設し、既存 CI の patch gate 経路へ blocking で配線する
- B. 入れる。ただし advisory(非 blocking)として配線し、既存エントリの遡及ブロックを避ける
- C. 入れない(是正のみ。ガードは別 intent)
- X. Other (please specify)

[Answer]: A — blocking ガードを新設し CI へ配線(E-code: auto-decision-36a5db8e6641e04bc18ac7f0fe6c39ca、decider: agent-recommendation、reviewState: unreviewed)
