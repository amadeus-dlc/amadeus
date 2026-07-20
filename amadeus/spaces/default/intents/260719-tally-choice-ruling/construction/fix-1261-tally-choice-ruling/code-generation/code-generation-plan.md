# Code Generation Plan — fix-1261-tally-choice-ruling

上流入力(consumes 全数): requirements.md(per-unit 設計6点は bugfix degrade スコープの consumes_absent 宣言どおり不在 — FD が SKIP のため、FD へ委譲された細目は本 plan が確定する)

> 測定 ref: origin/main 前提の bolt ブランチ(base は builder fetch 時の最新 origin/main、#1263/#1264 着地の可能性あり — base SHA は builder が実測報告)。修正面は scripts/+tests/ のみ(配布外、code-structure.md:427)。

## Bolt 構成

単一 Bolt(`bolt/fix-1261-tally-choice-ruling`、base = origin/main)。walking-skeleton なし(scope-dependent 分類済み)。

## 設計確定(FD SKIP につき本 plan が FD 委譲分を確定 — 全て E-TCRRA 裁定の範囲内)

1. **TallyResult 型**(E-TCRRA3=A+留保2件): 判別ユニオンを維持し decided 側を拡張 —
   - decided: `{ winner: { internalNo, label }, choiceCounts: [{ internalNo, label, count }...], goa: GoaCounts }`(outcome 二値は winner から導出可能になるため**廃止し winner を正とする**。既存文字列描画との互換は rulingText 側で吸収)
   - hold: 既存 reason(quorum/block/discussion)維持+**choice tie を hold reason "tie" として再定義**(E-TCRRA2=A)。旧 GoA 軸 tie(favor===against)分岐は**廃止**(FR-1 で GoA が勝者決定から分離され意味を失うため — reviewer m4 の申し送りをここで確定)
   - **内訳母集団の定義(1文固定、e4 留保)**: choiceCounts と勝者選出の母集団は「per-voter 最新解決後の票集合(E-BFARA2=A 前提。amend 未実装の現行は original 全票)から **GoA 4(棄権)票を除外**した集合」— GoA1 留保3件の収斂どおり org 規則 (v) の choice 軸適用
   - choiceCounts は**単純票数のみ**(choice×GoA クロス分布は持たない — e3 留保)
   - GoaCounts は従来どおり**全票**(棄権含む)を数える — GoA 軸の成立判定((iii)(iv))は全票横断で不変
2. **勝者選出**(E-TCRRA1=A): 棄権除外母集団で choice 単純票数の最多を winner とする。同数 tie → hold("tie")。GoA 成立判定(8×1票 block 保留・5×2票 discussion)は従来分岐を維持し、**勝者選出より先に評価**(既存順序を変えない)。
3. **unknown-choice**(E-TCRRA4=A+留保2件): Ballot.parse のラダーへ `unknown-choice` を **unknown-voter 直後(識別子系)**に挿入(e2 留保の順序原則)。スキーマコメントに**分類順序の規約**(識別子の検証 → 内容の検証、現行5分類+挿入位置)を英語で明記(e4 留保)。
4. **描画**(FR-3(a)): rulingText は `裁定: <winner.label>(choice <internalNo>、<count>票)` 系の人間可読形+choice 別内訳行を record に出す。既存 record.md の「裁定: 採用」を pin する消費者(テスト・SKILL・verify)を repo grep で全数棚卸しし、破壊があれば実測順応(consumer grep は実装前に実施 — stderr-addition-consumer-grep の類推)。
5. **verify**: election.ts:440 の recompute 比較は tally 修正へ自動追随 — 新形での機能を実証テストで固定(FR-3(b))。

## 変更目録(planned)

- `scripts/amadeus-election-model.ts`: TallyResult 拡張・tally 書き換え(棄権除外母集団+choice 多数決+tie hold)・Ballot.parse unknown-choice+順序規約コメント
- `scripts/amadeus-election-record.ts`: rulingText/renderPersistDraft の winner 描画対応
- `scripts/amadeus-election.ts`: verify/handleTally の型追随(必要分のみ)
- `tests/unit/t234-election-model.test.ts`: choice-blind 前提の期待値更新(宣言必須)+新規 fixture 群
- 他 t23x/t241 系: consumer grep の結果に応じ最小追随
- 配布同期: **不要**(scripts/tests は dist 非対象 — code-structure.md:427 verbatim 確認済み)

## テスト要件(FR-5)

- E-GMEBT verbatim fixture(c2×2 GoA2+c1×1 GoA2 → winner=c2)— 現行コードで fail する落ちる実証の導出元
- 棄権除外 fixture(GoA4 票の choice が勝者選出・choiceCounts に入らない)
- choice tie → hold("tie") fixture
- unknown-choice 拒否 fixture(実在しない internalNo・0・負値)
- 既存 GoA 成立判定((iii)(iv))のグリーン維持+単節/複節 E-code 面は #1256 着地済みの受理を前提
- 落ちる実証: **fix コミット後**に正本のみ `git checkout <fix コミット SHA 直前の base SHA> -- <対象>` で pre-fix 切替 → 新テスト赤 → `git checkout <fix コミット SHA> -- <対象>` で復元 → green(E-GMECG 追補準拠 — 復元 ref は SHA 明示・stash 禁止)
- 閉包: E-GMEBT の実 ledger.json(leader tree リードオンリー参照 or fixture 転写)に対する tally が winner=choice2(不採用側)を返すことを in-process 実測

## 検証コマンド

`bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / push 前ローカル lcov(diff 追加行未カバー0 — tally は t234 から in-process 消費で spawn 盲点なし)。dist:check/promote:self:check は修正面が非対象につき回帰確認のみ(触れていないことの確認)。

## 実装体制

builder subagent(amadeus-developer-agent、worktree 隔離)1名。conductor は plan/summary・検証裏取り・PR 発行・レビュー依頼(実装者以外)。e2 直列: 本 Bolt が先行着地、e2 は CG で再接地(合意済み)。
