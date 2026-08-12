上流入力(consumes 全数): business-overview.md / architecture.md / code-structure.md

# Requirements — coverage-patch-allowlist の意味的監査(Issue #1622)

測定 ref: observed `854692fd7a11b124236b0427fe3d59e2fe6bf785`(RE の base は `ce3c3ccfd`)。
本書の事実はすべて `codekb/amadeus/re-scans/260811-allowlist-semantic-audit.md` を正本とする。

## Intent analysis

利用者が達成したいのは「patch coverage gate の免除台帳を**信頼できる状態に戻す**」ことであり、
個々のエントリを直すこと自体が目的ではない。

この台帳は「計測不能な行を免除する」という統制上の例外を運ぶ。例外が正当かどうかを判定する段が
存在しなければ、ゲートは通っていても意味を持たない(`org.md` Forbidden の検証劇場と同族 —
偽の信頼を生む分だけゲート不在より悪い)。この意味づけは RE の scan record を出典とする。
本書が consume する 3 面のうち本 intent の節を持つのは `architecture.md` のみで、
`business-overview.md` と `code-structure.md` は持たない(下記「上流 consume の利用範囲」を参照)。

`architecture.md`(observed `854692fd7` の節)の消費者グラフが示すとおり、台帳を解釈する実装は
`tests/coverage-patch-gate.ts` の 1 箇所のみで、CI 配線も PR イベント時の 1 経路のみ。
したがって是正と再発防止の適用点は一意に定まる。同節は `findStaleAllowlistEntries` が存在検査であることも記す。

**上流 consume の利用範囲(実測)**: 本 intent の RE は `architecture.md` / `api-documentation.md` /
`component-inventory.md` / `code-quality-assessment.md` の 4 面を更新し、`business-overview.md` /
`code-structure.md` / `dependencies.md` / `technology-stack.md` の 4 面は「レビュー済みで無変更」とした。
したがって本書が consume する 3 面のうち、本 intent の新規事実を載せるのは `architecture.md` のみである。
`business-overview.md` と `code-structure.md` は**本 intent に関する記述を持たない**ため、
両者からは既存の一般記述(このリポジトリの業務ドメインと、`tests/` 配下のデータファイルという配置分類)
のみを前提として受け取り、本書の主張の出典としては引かない。台帳の件数・分布・機序の出典は
すべて RE の scan record である。

**達成条件**: (1) 台帳の全エントリについて `reason` と免除対象の実体が一致していること (2) 一致を機械的に
検査でき、CI が不一致を止めること (3) 検査が真偽を決められない `reason` の書き方が今後入らないこと。

## Functional requirements

### FR-1: 台帳全 623 エントリの意味整合を照合する

裁定 Q1=C により対象は全数とし、スコープを縮小しない。
各エントリについてセレクタを機械解決し、解決先の実コードと `reason` の主張を突き合わせて
`一致` / `転位` / `判定不能` のいずれかを付与する。
判定結果は再実行可能な述語と一緒に記録する(`cid:requirements-analysis:enumeration-completeness-review`)。

**受け入れ**: 623 件すべてに判定が付き、`一致` + `転位` + `判定不能` の合計が 623 に一致する
(母集団の恒等式。`cid:functional-design:c1-identity-population-stratify`)。

### FR-2: 転位エントリをケースごとに是正する

裁定 Q2=C により、`reason` が説明する真の対象が免除に値するならセレクタをその対象へ張り直し、
値しないならエントリを削除する。どちらを採ったかと根拠をエントリ単位で記録する。

**受け入れ**: (1) 是正後に `bun tests/coverage-patch-gate.ts --check` が exit 0 を返すこと
(2) 是正前後の**免除対象行集合を機械 diff** し、**増加行・減少行の全件がエントリへ帰属している**こと
——具体的には、増加行は「張り直しを採ったエントリの新解決先の行」であり、減少行は「張り直しを採った
エントリの旧解決先の行」または「削除したエントリの解決先の行」であること。**どのエントリにも帰属しない
増加行は 0 件**とする (3) 張り直しを採ったエントリは、張り直し先が免除に値すると判定した根拠を、
削除を採ったエントリは削除根拠を、それぞれエントリ単位で記録すること。

`exit 0` は免除が緩む方向へ増えても返るため、実効の担保は (2) の帰属条件である。
判定は集合演算とエントリ帰属で決まり、散文による説明は合否の根拠にしない。
増加行を一律 0 件にはしない —— それは裁定 Q2=C が認める「セレクタ張り直し」を構造的に不能にし、
是正方式を削除一択へ縮小してしまうため。

### FR-3: `reason` の記述規約を定め、`判定不能` と分類された全エントリを規約準拠へ書き換える

裁定 Q3=B。規約は「1 エントリの `reason` は**単一の構文クラス**を主張する」こととし、
選言(`A, B, or C`)による主張を禁じる。

**申告付き逸脱(裁定文言からの範囲拡大)**: Q3=B の選択肢文言は対象を「45 件」と名指すが、本書はこれを
**下限**として扱い、対象を FR-1 の `判定不能` 集合全体へ拡大している。理由は、45 件に限ると
FR-3 の受け入れ(`判定不能` 0 件)が達成不能になり、iteration 1 の BLOCKER-1(範囲の決定不能)が
再発するため。拡大は裁定の趣旨(反証可能な `reason` 記述への移行)の範囲内だが、
文言より広いことをここに申告する(`cid:requirements-analysis:implementation-deviation-election` の
成果物段での申告)。

**対象母集団は FR-1 の分類結果から決まる** — FR-1 で `判定不能` と付与された全エントリが対象である。
既知の下限は選言型 boilerplate の 45 件(「defensive, type-only, or spawned-boundary path」20 件 +
「Residual defensive, invalid-input, replay, or process-boundary」25 件)だが、`reason` が識別子を
名指さない 498 件のうち FR-1 が `判定不能` と判定したものも含む。上限は 623 件だが、`一致` と `転位` に
分類されたエントリは規約を既に満たしているため対象外となる。**したがって FR-1 → FR-3 の実行順序は必須**で、
FR-1 の完了前に FR-3 の工数は確定しない(OQ-1 と対)。

**受け入れ**: (1) 対象母集団の件数が FR-1 の `判定不能` 件数と一致すること (2) 書き換え後に
FR-1 の分類を再実行すると `判定不能` が 0 件になること (3) `一致` / `転位` に分類済みのエントリの
`reason` を書き換えていないこと(差分で確認)。

**FR-1 との契約関係**: FR-1 の受け入れは分類の網羅性(合計 623)のみを要求し、`判定不能` の残存を許容する。
FR-3 はその残存を 0 へ落とすことを要求する。両者は**順序を持つ別段の契約**であり矛盾しない。
最終状態の契約は FR-3 の (2) が定める。

### FR-4: `reason` とセレクタの整合を検査する機械ガードを新設する

裁定 Q4=A。最小の検査面は「`reason` が名指す関数名と `selector.function` の照合」。
加えて FR-3 の規約により主張される構文クラス(型のみ / catch 節 / dispatch case / spawn-only エントリ)を
AST で検証する。

**この検査面を選んだ根拠(件数の再導出可能な形)**: RE の機械サーベイは
`reason` 中の camelCase 識別子(`\b([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]{2,})\b`)が解決先の関数名または
対象行本文に現れないエントリを候補として挙げ、`total=623 withNamedIdentifier=125 noIdentifierHit=51` を得た。
RE が verbatim 実読で確定転位と判定した 18 件のうち、**この候補 51 件に載ったのは 8 件**で、
残る 10 件は候補外から実読で発見された(候補は再現率 100% ではない)。候補 51 件のうち
RE が adjudicate したのは 8 件で、いずれも確定転位と判定された(候補のうち `一致` と判定されたものは
無い)。残る 43 件は**未判定**である。すなわち 51 = 8(判定済み・全件が転位)+ 43(未判定)であり、
確定転位 18 件 = 8(候補内)+ 10(候補外)。両者は別軸の集計である。
本 FR が採るのは候補生成のヒューリスティックそのものではなく、**確定 18 件すべてに共通した性質**
(`reason` が名指す関数名と `selector.function` の不一致)である。

**受け入れ**: (1) 現行台帳の既知転位を注入すると赤になること(落ちる実証) (2) 是正後の台帳では
緑になること。両側を実測する(`cid:code-generation:corpus-sweep-for-new-guards`)。
注入は「注入 → 赤の実測 → revert push 完了」を不可分の 1 セットで行い、承認候補 PR の head へ
注入コミットを残さない(`cid:code-generation:falling-proof-injection-one-set`)。

### FR-5: ガードを CI へ blocking で配線する

裁定 Q4=A により advisory ではなく blocking とする。配線先は `ci.yml` の集約ジョブ `CI Success` の
`needs` に載る経路とする——独立ジョブとして追加するだけでは赤がマージを止めない
(`cid:code-generation:c1-2814-aggregate-needs-is-blocking`)。

**受け入れ**: `require_result` 相当の実評価が run ログに現れ、ガードを意図的に赤にした PR が
マージ不能になることを実測する。この実証は「注入 → 赤の実測 → revert push 完了」を不可分の 1 セットで
行い、承認候補 PR の head へ注入コミットを残さない。承認待ち PR は任意時点でマージされうる前提に立ち、
別ブランチでの実証を優先する(`cid:code-generation:falling-proof-injection-one-set`)。

### FR-6: 規約違反と構文クラス不定の検出をテストで固定する

RE の実測で、台帳の意味整合を検査するテスト・ガードは 0 件だった。
FR-4 の受け入れが「転位」クラスの落ちる実証を担うのに対し、本 FR は残る 2 クラス
——**規約違反**(選言型 `reason` の混入)と**構文クラス不定**(`reason` からどの構文クラスを
主張しているか決められない)——の検出を対照テストで固定する。
3 クラスの担当は FR-4(転位)と FR-6(規約違反・構文クラス不定)で交差しない。

**用語の区別**: FR-1 の `判定不能` は「セレクタ解決先と `reason` の主張を突き合わせた三値分類の結果」で、
本 FR の**構文クラス不定**は「`reason` 単体から構文クラスを決められない状態」を指す。前者は照合の結果、
後者は `reason` の記述品質であり、別の述語である。

**受け入れ**: 2 クラスそれぞれに赤の実測があり、規約準拠の正当な既存データでは緑であること。

### FR-7: 判定・是正の全過程を再実行可能な形で記録する

件数・判定結果・使用した述語(パターン・対象・除外条件)を、後続の読み手が同一結果を再導出できる形で
成果物へ残す(`cid:requirements-analysis:enumeration-completeness-review` の E-ASD-RES13 追補)。

**受け入れ**: 記録された述語を再実行して同一の件数が得られること。

## Non-functional requirements

- **NFR-1(決定性)**: FR-4 のガードは同一入力に対し常に同一判定を返す。LLM 判断を検査経路に含めない。
  **検証手段**: 同一入力での 2 回実行が byte-identical な出力を返すことを assert するテストを置く。
  加えて、ガードの実装ファイルがネットワーク・LLM クライアントを import しないことを静的に assert する
  (実行で踏めない非追加型契約のため、検査手段を束ねる — `cid:functional-design:c6`)。
- **NFR-2(fail-closed)**: 判定不能・解決失敗・述語の異常終了はすべて赤とする。空出力を「一致」と解釈しない
  (`cid:reverse-engineering:c6-absence-predicate-exit-code`)。
- **NFR-3(実行時間)**: ガードは既存 patch gate と同じ CI ステップ内で完了する。
  絶対値の閾値は観測データがないため置かない(`cid:code-generation:c1-threshold-inside-observed-range`)。
  実測後に観測レンジの内側へ閾値を設けるかは別途判断する。
- **NFR-4(検証劇場の禁止)**: ガードの verdict は実行結果から導出する。status のハードコード、自己参照比較、
  どのコードも消費しない検証用フィールドを置かない。
  **検証手段**: FR-4 の落ちる実証(既知転位の注入で赤)が、verdict が実行結果由来であることの実測となる。
  加えて、ガードが返す全フィールドを消費するコードが存在することを、fixture ベースのテストで固定する。

## Constraints

- 台帳を解釈する実装は `tests/coverage-patch-gate.ts` の 1 箇所のみ。ここを唯一の適用点とし、
  第 2 の解釈器を作らない(`architecture.md` の消費者グラフ)。
- CI 配線は PR イベント時の 1 経路のみ。`.github/workflows/ci.yml` の集約 `needs` に載せる必要がある。
- 正本は `packages/framework/core/` / `packages/framework/harness/<name>/` で、`dist/` とセルフインストール
  ツリーは `bun run build` の生成物として扱う(`project.md` Mandated)。
- 実行可能な振る舞いの追加・変更は TDD を既定かつ必須とする(`team.md` Testing Posture)。
- 変更は surgical に保ち、要求されない後方互換レイヤー・移行シムを足さない(`org.md` Forbidden)。

## Assumptions

- **A-1**: RE の確定転位 18 件は下限であり、全数照合で件数は増える。18 は最終値ではない
  (根拠: RE の UNMEASURED-1)。
- **A-2**: 498 件(`reason` が識別子を名指さない)の判定には人手の adjudication が要る。
  FR-3 の規約化はこの母集団を機械判定可能へ寄せるための前提でもある。
- **A-3**: 是正によって免除が外れた行のうち、実際には計測可能なものは patch gate で新たに未被覆として
  現れうる。その分の被覆追加は本 intent の作業に含まれる(根拠: FR-2 の受け入れ条件)。
- **A-4**: `expiry` 面の腐敗は本 intent では扱わないが、存在しうる(RE の UNMEASURED-1)。
- **A-5(裁定の未レビュー性)**: Q1〜Q4 は autonomy `full` の下で `decide-question` が
  `decider: agent-recommendation` として裁定したもので、**全件 `reviewState: unreviewed`** である
  (solo-election の native 結果が無く loud degradation が記録済み)。人間レビューは
  `amadeus-bolt review-auto-decision` で後日行われ、**反転しうる**。反転時の影響範囲は
  Q1→FR-1 の対象範囲、Q3→FR-3 の規約化そのもの、Q4→FR-5 の blocking 配線に及ぶ。
  下流は本書の裁定を「既決だが未レビュー」として扱うこと。

## Out of scope

- `expiry`(解除条件)の意味整合の棚卸し — 別 Issue へ分離する。Issue #1622 本文が求めるのは
  「`reason` と現行行内容」の照合であり `expiry` を含まず、RE も UNMEASURED-1 として射程外に置いた。
  判断を要さない執行として処理(裁定 ID `auto-decision-f50811841ad28b148d18a255c5ecd1c9`)。
  **「分離する」は本 intent 内での起票を含む** — A-4 が認めるとおり `expiry` 面の腐敗は存在しうるため、
  記録のみで終えると追跡先を持たないまま消える。起票は construction までに行い、**Issue 番号は
  construction の記録側へ残す**(承認済みの本書を後段で書き戻さず、凍結時点を保つ)。
  着手時期の決定は利用者の専権。
- Issue #2162(no-silent-drop の bootstrap provenance)の修正 — 分離を維持する。本 intent は #1622 を
  対象として birth されており、別 Issue の取り込みはスコープ拡大にあたる。着手対象の決定は利用者の専権
  (`cid:requirements-analysis:issue-selection-user-decides`)。執行として処理
  (裁定 ID `auto-decision-fb73794c1ee7a5cf9ea169679137a5ce`)。
- `findStaleAllowlistEntries` の stale 判定そのものの設計変更(存在検査から意味検査への置換)。
  本 intent は意味検査を**新設**するのであって、既存の stale 検査を置き換えない。
- 転位が生んだ実害(偽赤 / 偽緑)の定量(RE の UNMEASURED-4)。是正の前後比較で説明可能であれば足りる。

## Open questions

- **OQ-1**: 全 623 件の adjudication を、どの粒度で機械述語と人手に分けるか。
  実行順序は FR-3 で確定した(FR-1 の分類 → その `判定不能` 集合が FR-3 の対象)ため、
  残る未決は「FR-1 の分類自体をどこまで機械述語で自動化し、どこから人手 adjudication にするか」の
  境界の置き方である。application-design の所掌。
- **OQ-2**: FR-3 の規約が定める「単一の構文クラス」の閉じた語彙(型のみ / catch / dispatch case /
  spawn-only / その他)を何にするか。RE の `reason` 語彙分布(type-only 76 / catch 32 / dispatch・usage 10)が
  出発点になるが、498 件の未分類母集団を見てから確定する必要がある。
- **OQ-3**: 是正で免除が外れた行に被覆を足す作業量が大きい場合、FR-2 の受け入れ条件をどう扱うか。
  ここでスコープを縮めるなら利用者の裁定が要る(`cid:build-and-test:no-silent-scope-narrowing`)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-11T14:33:06Z
- **Iteration:** 1
- **Scope decision:** none

ステージ契約の必須 7 節と Minimal 帯の FR 数は充足。裁定の選択肢内容も正確に反映されている。ただし FR-3 の AC が作業範囲・FR-1 の三値分類・A-2 と三方向で矛盾し実装範囲が決定不能(BLOCKER)。加えて上流 2 面への装飾参照、裁定の未レビュー性の非転記、FR-2 の測定不能な受け入れ基準が MAJOR。

### Findings

- BLOCKER | FR-3 の受け入れ基準が作業範囲(45 件)・FR-1 の三値分類・A-2 と三方向で矛盾し、実装範囲が 45 件か 623 件か決定不能。requirements.md:46-53 の本文は対象を 45 件と明示する一方、AC は全 623 件が単一構文クラスを主張し FR-4 の述語が判定不能を 0 件にすることを要求する。FR-1(:31-36)は判定不能の残存を許容するため契約が衝突し、A-2(:111-112)が人手 adjudication を要すると認める 498 件の扱いも未定。下流は両解釈のどちらでも要件に忠実に実装でき工数が桁で違う
- FOLLOW-UP | (MAJOR) business-overview.md への帰属が実在しない装飾参照。requirements.md:13-15 は「business-overview.md が記すとおり」として統制上の例外の意味づけを引くが、同ファイルに 260811 の節はなく 260811/計測不能/免除 はいずれも 0 hit。allowlist への言及 3 箇所はこの主張を支えない
- FOLLOW-UP | (MAJOR) code-structure.md への帰属が実在しない装飾参照。requirements.md の分類・件数の帰属先として引かれているが、同ファイルに 260811 の節はなく allowlist 言及はすべて他 intent の履歴節で当該分類・件数を述べていない
- FOLLOW-UP | (MAJOR) 全裁定が reviewState: unreviewed である事実が requirements.md へ転記されていない。requirements.md:30/:48/:66 は裁定を人間レビュー済みの既決と読める形で書いており、requirements.md 単体を読む下流は後日反転しうることを知らない(留保の保存違反)
- FOLLOW-UP | (MAJOR) FR-2 の受け入れ基準「判定対象行集合の差分が説明可能であること」(requirements.md:43-44)が測定不能で実質基準を代替しうる。合否判定者・判定形式が未定義で、散文 1 行で満たせる。exit 0 は免除が緩む方向の増加でも返るため、実効の担保は測定不能な括弧内だけに依存している。Out of scope(:128)にも同じ語が現れる
- FOLLOW-UP | (MINOR) NFR-1(決定性・LLM 判断を検査経路に含めない)と NFR-4(検証劇場の禁止)は実行で踏めない静的契約だが、テスト ID も機械検査も束ねられていない。NFR-2 は cid を引いており対照的
- FOLLOW-UP | (MINOR) NFR-3 の「体感できる遅延を足さない」(requirements.md:92-93)は誰も判定しない文言。検査可能な前半(同一 CI ステップ内で完了)だけを契約にするか、観測後に閾値を設けると条件付きにする
- FOLLOW-UP | (MINOR) 件数の関係が本文から再導出できない。候補 51 − 未判定 43 = 8 と確定転位 18 件の対応が読めず、FR-4 の設計根拠(requirements.md:57-58)をスコープ内の記述だけでは再導出できない。述語の併記が要る
- FOLLOW-UP | (MINOR) Out of scope の「別 Issue へ分離する」(requirements.md:119-121)が起票の約束か記録のみか未定。記録のみなら A-4 が認める既知の腐敗が追跡先を持たないまま消える
- NIT | FR-4 の落ちる実証 AC と FR-6 の 3 クラス注入テストが重複している。FR-6 を FR-4 の AC 拡張へ畳むか、FR-6 を規約違反・判定不能の 2 クラスへ限定すると境界が明快
- NIT | FR-5 の受け入れ(意図的に赤にした PR がマージ不能であることの実測)に、注入から revert push までを不可分の 1 セットとする規律を併記しておくと、承認待ち PR へ注入コミットが残る事故を防げる

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-11T14:40:44Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の 11 件のうち 9 件が閉包(BLOCKER-1 / MAJOR-1〜4 / MINOR-1・2・4 / NIT-1)。MINOR-3 は部分閉包、NIT-2 は FR-5 で未閉包。新規に、MAJOR-4 の是正が裁定 Q2=C の張り直し経路を構造的に不能にする矛盾を生んだため BLOCKER。ステージ契約の必須 7 節と FR 数帯は充足、新規引用・数値も 8 件の導出を除き整合。

### Findings

- BLOCKER | FR-2 の新 AC(増加行 0 件)が裁定 Q2=C の主要是正経路「セレクタ張り直し」を構造的に不能にする。requirements.md:51-54 は増加行 0 件を要求し減少行のみ説明対象とするが、:47-49 の裁定は真の対象へセレクタを張り直すことを認めており、張り直しは新解決先の行を免除集合へ入れるため増加行が非ゼロになる。AC を満たす唯一の道が全転位エントリ削除となり Q2=C を削除一択へ縮小する。張り直しで生じた増加行の説明経路も存在しない
- FOLLOW-UP | requirements.md:16 の「上流 codekb の 3 面には本 intent の節が無い」が事実に反し同一文書の :18/:22-25 と矛盾する。architecture.md:3 は本 intent の節を持つ(business-overview.md / code-structure.md は 260811 が 0 hit で主張どおり)。:25 自身が「本 intent の新規事実を載せるのは architecture.md のみ」と書いており全称否定と両立しない
- FOLLOW-UP | FR-3 の対象母集団が裁定 Q3=B の選択肢文言(45 件)を無申告で拡大している。questions:61 の採択肢は 45 件を名指すが requirements.md:62-67 は FR-1 の判定不能全体(上限 623 件)へ再定義しており、:59 は「裁定 Q3=B。」とのみ書いて拡大を申告していない。範囲拡大自体は BLOCKER-1 の解消として合理的だが申告付き逸脱として明記が要る
- FOLLOW-UP | FR-4 の件数導出 51 − 43 = 8 が「候補に載りかつ確定した件数」であることの根拠を欠く。差分が示すのは判定済みの件数であって、判定済みが全件確定転位であったことは本文から導けない。FR-4 の述語は確定 18 件から導かれており実装は左右されないが、MINOR-3 が求めた再導出可能性がこの 1 段で切れている
- NIT | NIT-2 が指摘された FR-5 では未閉包。是正は FR-4 側(requirements.md:94-95)にのみ入り、FR-5 の受け入れ(:103-104)には注入 1 セット規律が無い。承認候補 PR の head へ注入が乗るリスクがあるのは FR-5 の実証のほう
- NIT | 判定不能の語が 2 つの異なる述語に使われている。FR-1(:40)は三値分類の結果、FR-6(:110-111)は構文クラスを判定できない reason を指す。片方を改称すると FR-3 / FR-6 の担当境界が一意になる
- NIT | Out of scope の expiry 起票が「Issue 番号を本書へ追記する」と書く(:170-171)。承認済み requirements.md を construction 段で書き戻す運用は本書の凍結時点を曖昧にする。追記先を construction の記録側にするほうが版管理として素直
