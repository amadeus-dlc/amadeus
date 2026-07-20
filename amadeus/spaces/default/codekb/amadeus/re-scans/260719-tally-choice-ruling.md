# re-scan 記録 — 260719-tally-choice-ruling

## 実行メタデータ

- Date: 2026-07-20(Asia/Tokyo)
- Intent: `260719-tally-choice-ruling`
- Issue: [#1261](https://github.com/amadeus-dlc/amadeus/issues/1261)(選挙 CLI の tally が choiceInternalNo を裁定導出に使わない)
- Scope / project type: `bugfix` / Brownfield
- Repository / stage: `amadeus` / `reverse-engineering`(2.1)
- Base commit: `a326f47bc0146a3b4285552f42b92fd61fb343a7`(`re-scans/260719-goa-multiseg-ecode.md` の Observed、HEAD 祖先 `git merge-base --is-ancestor` exit 0 実測)
- Observed commit: `262a86db9b2a47b59ac0b1287e540295ca212378`(現 HEAD)
- Base selection: 直近 re-scan の Observed を継承。区間 `a326f47bc..HEAD` は 20 コミットだが `git log a326f47bc..HEAD -- scripts/` = **0 件**(工程記録+delegate 取込のみ)。フォーカス正本(`scripts/amadeus-election*.ts`)は区間内で無変更のため、Observed=HEAD のワークツリー実測が base 断面と同一(rescan-base-ancestry 準拠)。
- 測定 ref: 全 file:line は Observed=HEAD `262a86db9` のワークツリー実測(measurement-ref-in-artifacts 準拠)。E-GMEBT 実データは leader tree `55af93d95` のリードオンリー実測(`.../runs/20260719-231310-08a0/leader/amadeus/spaces/default/elections/E-GMEBT`)。
- Focus: `tally`(model.ts:321)を起点に (1) tally 実文と ruling 導出、(2) choice が裁定へ流れない消費チェーン全数、(3) `Ballot.parse` の choice 検証不在、(4) E-GMEBT fixture、(5) GoA 8段と choice 軸の関係、(6) tally テスト blast radius、(7) e2 `260719-ballot-failclosed-amend` との関数交差。
- 実施体制: Developer code scan → Architect synthesis(codekb 合成・timestamp 更新は後続)。

## 結論

バグの一次原因は `scripts/amadeus-election-model.ts:321` の `tally(_election, ballots)` が **第1引数 election を使わず(underscore 明示)、`choiceInternalNo` を裁定導出に一切参照しない**ことにある。tally は GoA の favor/against 集計(FAVOR={1,2,3,6} / AGAINST={7,8})だけで `outcome: "adopted" | "rejected"` を決める(:334-335)。多肢選挙で「どの choice が多数を得たか」は失われ、全票が賛成側 GoA なら choice 分布に関わらず `adopted` になる。

原因の所在は**設計**にある。tally は intent `260718-election-ts-foundation` Bolt 1(walking-skeleton)の "minimal tally"(model.ts:3 ヘッダコメント)として GoA-only で導入され、Bolt 2 以降も choice 集計は設計されなかった。ballot は `choiceInternalNo` を受理・保存・materialize する(下記チェーン)が、それを消費する集計ロジックが存在しない — 「どのコードも消費しない choice フィールド」に近い状態で、construction phase guardrail「文書のふりをしたフィールドを持たせない」の裏面(データは流れるが判断に使われない)に当たる。requirements/functional-design が choice 多数決を裁定の正本と規定していなかった設計時欠落。

実害は E-GMEBT で顕在化した(§「E-GMEBT fixture」)。leader 注記でユーザー裁定により「不採用」へ手動是正済み、Issue #1261 起票済み。

## tally 実文(model.ts:321-337、verbatim 抜粋)

```ts
const FAVOR = new Set([1, 2, 3, 6]);
const AGAINST = new Set([7, 8]);

export function tally(_election: Election, ballots: Ballot[]): TallyResult {
  const counts: GoaCounts = { favor: 0, against: 0, abstain: 0, discuss: 0 };
  let blocks = 0;
  for (const b of ballots) {
    if (FAVOR.has(b.goa)) counts.favor++;
    else if (AGAINST.has(b.goa)) counts.against++;
    else if (b.goa === 4) counts.abstain++;
    else counts.discuss++;
    if (b.goa === 8) blocks++;
  }
  if (blocks >= 1) return { kind: "hold", reason: "block", counts };
  if (counts.discuss >= 2) return { kind: "hold", reason: "discussion-needed", counts };
  if (counts.favor + counts.against === 0) return { kind: "hold", reason: "quorum-short", counts };
  if (counts.favor > counts.against) return { kind: "established", outcome: "adopted", counts };
  if (counts.against > counts.favor) return { kind: "established", outcome: "rejected", counts };
  return { kind: "hold", reason: "tie", counts };
}
```

- `TallyResult`(:312-314): `{ kind:"established"; outcome:"adopted"|"rejected"; counts }` | `{ kind:"hold"; reason; counts }`。**choice の内訳を保持するフィールドを持たない**(GoaCounts のみ、:303-308)。
- 決定順序(:319 コメント): block → discussion-needed → quorum-short → majority/tie。choice はどの分岐にも現れない。
- `b.choiceInternalNo` は tally 内で1度も読まれない(grep 実測: model.ts 内で `choiceInternalNo` は型宣言 :114/:127/:154/:172/:198 と parseBallotShape のみ、集計側 0 参照)。

## choice が裁定へ流れない消費チェーン(全数列挙、enumeration-completeness)

`choiceInternalNo` は受理〜保存〜materialize までは全段で運ばれるが、**裁定(ruling)を導出・描画するどの段でも消費されない**。各段を file:line で確定:

| 段 | file:line | choice の扱い | 裁定への影響 |
| --- | --- | --- | --- |
| 受理 | `model.ts:184 Ballot.parse` → `:198 choiceInternalNo: shape.choiceInternalNo` | number 型として受理・格納(§「choice 検証不在」参照) | 値は保持されるが照合なし |
| store 追記 | `store.ts:124 appendBallot` → `:161 ballots:[...ledger.ballots, ballot]` | ballot 丸ごと ledger.json へ append | そのまま保存 |
| tally 集計 | `election.ts:353 tally(loaded.value.election, ledger.value.ballots)` → `model.ts:321 tally` | **未参照**(GoA のみ) | ★ここで choice が裁定から脱落 |
| materialize | `store.ts:196 materialize` → `:210-215` ballots/ へ書出し `:223` tally.json に `result`+`ballots` 格納 | ballot 全体を保存(choice 含む) | 保存されるが result は GoA 由来 |
| render | `election.ts:363 handleRender` → `:386 renderPersistDraft(code, election, effective, ballots, timeline)` | ballots を渡すが… | `effective` は tally 由来 outcome |
| ruling 描画 | `record.ts:127 renderPersistDraft(code, _election, result, ballots, timeline)` → `:107 rulingText(result)` | **`_election` 未使用**・rulingText は `result.outcome` のみで `裁定: 採用/不採用` を描画(:109) | ★choice 無視の裁定文字列を出力 |
| verify | `election.ts:434 handleVerify` → `:440 recomputed = tally(election, ballots)` → `:441` stored result と JSON 比較 | tally を再実行して stored と一致確認 | ★GoA-only を再計算し「一致」。choice 乖離は検出不能 |

補足:
- render の `effective`(election.ts:378-385)は hold+人間裁定(resolutions)がある場合のみ outcome を上書きするが、これは hold-resolved の choice(adopted/rejected 文字列)であり多肢 choice 分布とは無関係。
- verify(:440-442)は tally の GoA-only 出力を再計算して stored と突き合わせるため、**tally を choice ベースに直せば verify も自動的に choice ベースの検証になる**(recompute が同関数を呼ぶ設計上、修正は tally 一点に集約できる)。ただし verify が GoA 行(GoaFreq)を別途照合する面(:447 checkGoaLine, :450 verifyReservations)は choice と独立で不変。

## Ballot.parse の choice 検証不在(model.ts:184-204、e4 所見の実文確認)

`Ballot.parse` の 5 分類 fail-closed 検証(:181-183 コメント順: parse-failure → unknown-election → unknown-voter → goa-out-of-range → reservation-missing)には **choiceInternalNo の妥当性検査が無い**:

```ts
// parseBallotShape :164
if (typeof r.choiceInternalNo !== "number" || ...) return null;   // 型検査のみ
// Ballot.parse :187-192 — election.choices との照合分岐は存在しない
if (shape.electionId !== election.electionId) return err("unknown-election");
if (!election.voters.includes(shape.voter)) return err("unknown-voter");
const goa = Goa.parse(shape.goa);
...
// :198 — choiceInternalNo をそのまま採用(照合なし)
choiceInternalNo: shape.choiceInternalNo,
```

- `election.choices`(`Choice[] = {internalNo, label}`、:48)は parse 時に利用可能(第2引数 election)だが、`choiceInternalNo` が `election.choices.some(c => c.internalNo === ...)` を満たすかの照合が無い。
- 帰結: 実在しない `choiceInternalNo`(例: choices=[1,2] に対し 99)も、負値・0 も型さえ number なら受理される。unknown-voter と対称の `unknown-choice` 分類が欠落(symmetric-pair-review クラス — 「voter は照合するが choice は照合しない」非対称)。
- これは #1261 主訴(tally が choice を使わない)の**隣接ギャップ**であり、tally を choice ベースに直すなら「不正 choice 値が集計に混入しない」保証が受理段で必要になる。requirements で修正スコープに含めるか別 Issue 化するかは未決(§「requirements への未決点」)。

## E-GMEBT fixture(leader tree リードオンリー実測、落ちる実証・回帰テストの導出元)

leader tree `55af93d95` の `elections/E-GMEBT/` を verbatim 実測。**バグを再現する唯一の実データ**:

- 定義(election.json): 2 choices — `{internalNo:1, label:"採用 — …persist"}` / `{internalNo:2, label:"不採用 — …diary 記録のみ"}`。voters = [e2, e3, e4]。state = recorded。
- 3票(ledger.json、choice / goa):
  - e2: `choiceInternalNo: 2`(不採用), `goa: 2`
  - e3: `choiceInternalNo: 1`(採用), `goa: 2`
  - e4: `choiceInternalNo: 2`(不採用), `goa: 2`
- **choice 分布: choice 2 = 2票(e2,e4)/ choice 1 = 1票(e3)→ 正しい多数は choice 2 =「不採用」(2-1)**。
- GoA 分布: 全員 GoA 2 → 全票 FAVOR → favor=3, against=0。
- tally.json 実出力: `{ kind:"established", outcome:"adopted", counts:{favor:3,against:0,...} }`。
- record.md 描画(:実測): `裁定: 採用` ← **choice 多数(不採用)と正反対の誤描画**。
- leader 注記(record.md 末尾、ユーザー裁定): 「本 record の『裁定: 採用』は CLI tally の GoA 集計のみによる描画であり、ballot の choice 分布(選択2=不採用: e2, e4 / 選択1=採用: e3)と乖離している(CLI 欠陥)。**正式裁定はユーザー承認により『不採用』(choice 多数 2-1)**」。

回帰テスト fixture 導出: 「全票同一 GoA(賛成側)だが choice が割れる」多肢選挙。期待は choice 多数(2)= 不採用/rejected、現行実装は adopted を返す。落ちる実証(inject-runtime-consumed-lines)は tally の :334 分岐(実行時消費行)に注入して赤を実測できる。

## GoA 8段と choice 軸の関係(修正方式選挙の材料)

org.md `gradients-of-agreement-scale` の 8段(1 全面支持 / 2 軽微留保 / 3 留保付き支持 / 4 棄権 / 5 追加議論 / 6 不本意だが支持 / 7 重大な不同意 / 8 拒否)と、tally の集計軸を整理:

- **GoA 軸(合意度)と choice 軸(何を選ぶか)は本来独立**。GoA は「その票がどれだけ賛成か」、choice は「どの選択肢に投じたか」。
- **二値型選挙(A/B・0件確認・採否)では choice ≒ GoA が縮退**して見える: 「採用に GoA 6」と「不採用に GoA 6」の区別は choice でしか付かない。GoA の favor/against は**選択肢そのものではなく、その票の合意強度**を表すため、二値でも choice を見ないと「どちらが多数か」は決まらない(E-GMEBT がまさにこの縮退の破れ — 全員 favor GoA だが選択は割れた)。
- **多肢型(3択以上)では favor/against 二値集計は原理的に選択を表現できない**。tally の現行モデル(favor > against → adopted)は「単一命題への賛否」を暗黙前提とし、多肢の勝者選出には非対応。
- org.md GoA 集計規則 (i)「1-3・6=賛成側、7-8=反対側として多数決判定」は **choice ごとの母集団に対して適用されるべき**もので、全票横断の favor/against 合算ではない。現行 tally はこの適用対象(choice 別母集団)を持たない。
- 修正方式の論点(選挙材料): (a) choice 別に票を分け、各 choice の favor 数(または票数)で勝者を決めるか、(b) GoA を choice 内の重み付けに使うか単純票数か、(c) block(GoA 8)・discussion-needed(discuss≥2)・quorum-short・tie の hold 分岐を choice 軸でどう再定義するか。これらは requirements/functional-design で確定が必要(本 RE では方式を決めない)。

## tally テスト blast radius(absence-claim-grep-verify)

`tally(` の全呼び出しを全テストで grep(実測、**8 箇所・呼び出し9回**すべて `tests/unit/t234-election-model.test.ts` — 当初「7 箇所」と誤記、RA reviewer M1 指摘で列挙(8行)からの機械再計算により是正。:119 は1行に2呼び出し):

- :91 favor-majority → adopted(全 choiceInternalNo=1、GoA 1/2)
- :102 GoA 8 → hold block
- :110 all-abstain → hold quorum-short
- :119 determinism(same input twice)
- :143 tie / :146 rejected-majority(GoA 7)/ :149 oneDiscuss / :151 twoDiscuss

fixture helper(:27)は `choiceInternalNo: 1` 固定。**choice が割れる多肢選挙で「choice 多数が裁定を決める」ことを assert するテストは全域 grep で 0 件**(テスト名・関数名・`choiceInternalNo` 値の grep 実測)。全 tally テストは単一 choice で outcome を GoA のみから期待しており、バグは既存テストの盲点。t238(record)・t235/t236(store/loop)・t237/t241(e2e)にも choice 多数決の assert なし(grep 実測)。→ 回帰テストは新規追加が必要(既存の緑は choice 無視を固定しているため、修正時に t234:91 等の期待値見直しの要否を design で確認)。

## e2 交差評価(260719-ballot-failclosed-amend、関数単位目録)

e2 intent の requirements(engineer-2 tree `3a5dbf085`、`inception/requirements-analysis/requirements.md` 実測)と #1261 の touch 面を関数単位で照合。**同一関数 `tally` と `Ballot.parse` を両 intent が編集する強交差**:

| 関数(file:line) | e2 (#1252/#1253) の変更 | #1261 の変更 | 交差判定 |
| --- | --- | --- | --- |
| `Ballot.parse`(model.ts:184-204) | FR-1: `invalid-timestamp` 分類追加 / FR-3: `kind:"amend"`+ref 受理・`unknown-ref` 分類追加 | 隣接ギャップ: `unknown-choice` 検証追加(候補) | ★交差 — 同一 5分類ラダーに別クラスを追加。順序・分類名の整合が必要 |
| `tally`(model.ts:321-337) | FR-4: **母集団構成を per-voter 最新1票へ変更**(E-BFARA2=A 裁定、同時刻は amend 優先。kind 非区別全走査 :321-337 の反転) | ruling 導出を GoA-only → **choice 多数決へ変更** | ★★直接交差 — 同一関数本体。母集団(誰の票を数えるか)と裁定導出(何を選ぶか)の両方を書き換え |
| `verify` recompute(election.ts:440) | FR-4(b): verify と tally が同一解決済み母集団を使い乖離ゼロ | tally 変更に追随(recompute が同関数を呼ぶため自動) | ★交差 — tally 修正が両 intent に波及 |
| `classifyLate`(model.ts:296-298) | FR-4(c): amend との整合を design で確定 | 無関係 | 非交差 |

- 合成の意味論: e2 FR-4 が「集計母集団 = voter ごと最新1票」を確定し、#1261 が「その母集団に対し choice 多数決で裁定」を確定する — **二つは直交する層(母集団解決 × 勝者選出)として合成可能**だが、同一関数 `tally` を両方が編集するため c6 非交差判定は**交差=直列化が原則**。マージ順序と統合形(per-voter 解決後の母集団に choice 集計を適用)を requirements/delivery で明示する必要がある。
- e2 の裁定は既に確定(E-BFARA1/2/3 = すべて A、2026-07-19 開票、record = leader `5e96f8766`)。e2 が先着すれば tally は per-voter 母集団を持つ形になり、#1261 はその上に choice 集計を載せる。#1261 が先着すれば e2 が choice 集計済み tally の母集団を差し替える。いずれも同一関数のため worktree 隔離しても最終マージで衝突判定必須。

## requirements への未決点(Architect 合成材料)

1. **修正スコープに `unknown-choice` 受理検証(Ballot.parse)を含めるか**。tally を choice ベースにするなら不正 choice 値の混入防止が受理段で要る一方、#1261 主訴は tally 導出。同 Issue で直すか隣接 Issue 化するかは未決(e2 が Ballot.parse を別途拡張中のため統合形の調整も要る)。
2. **choice 勝者選出の方式**(GoA を choice 内でどう使うか、単純票数か favor 数か)と、hold 分岐(block/discussion-needed/quorum-short/tie)の choice 軸での再定義。方式選挙が必要(本 RE では未決定)。
3. **`TallyResult` 型の拡張**: 勝者 choice(internalNo/label)と choice 別内訳を裁定に保持する必要があり、現行 `outcome:"adopted"|"rejected"` の二値では多肢を表現不能。型変更は record.ts `rulingText`(:107)・verify・t234/t238 fixture へ波及(functional-design:cross-unit-type-verbatim-check / state-machine-cardinality-check の対象)。
4. **既存 tally テスト(t234)の期待値**: choice=1 単一固定の緑が choice 無視前提。修正で期待値見直しの要否を design で確認。
5. **e2 とのマージ順序・統合形**の確定(上記交差目録)。同一関数編集のため直列化 or 精密な非交差設計が必要。
