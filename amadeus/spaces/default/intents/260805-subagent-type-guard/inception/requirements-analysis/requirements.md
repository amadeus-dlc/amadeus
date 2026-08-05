# Requirements — subagent 型規律ガードと実効 model 属性の記録

**上流入力(consumes 全数)**: `intent-statement`(裁定 Q1〜Q4・SM-1〜4・申し送り R-1〜R-5 の正本 — 本書の全 FR の導出元)/ `scope-document`(In/Out 境界 CAP-0〜3・制約 CON-1〜4・risk-first 順序 — 本書の Constraints / Out of scope 節へ転記)/ codekb `business-overview`(本 intent の目的節 — Intent analysis の背景)/ codekb `architecture`(subagent 観測パイプラインの現在断面 — FR-2/FR-3 の患部座標の出典)/ codekb `code-structure`(hook・registry・集計 seam の構造 — FR-4 の実装座標の出典)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`(= origin/main。file:line・件数はすべて RE record `amadeus/spaces/default/codekb/amadeus/re-scans/260805-subagent-type-guard.md` の Architect 検証済み座標に依拠)
**起点**: Issue [#2279](https://github.com/amadeus-dlc/amadeus/issues/2279) / Mirror [#2288](https://github.com/amadeus-dlc/amadeus/issues/2288)

## Intent analysis(意図分析)

達成したいのは機能追加ではなく**監査の成立**である: (1) 定義済み persona(model ピン付き)を経由しない subagent 起動が起きた事実をその場で可視化し(検出)、(2) spawn ごとの実効モデルを事後に機械集計できる状態にする(可観測化)。business-overview の目的節が示すとおり、`team.md` の配分方針(高判断=opus)は現状 prose のみで機械的裏付けを持たず、実測では COMPLETED 974 件中 261 件(distinct 184)が許可集合外の ad-hoc 名で起動されている。

## Functional requirements(機能要件)

### FR-1: 許可集合の解決(CAP-0)

- **FR-1a**: 許可集合 = 定義済み persona 集合 ∪ ハーネス組込型集合。persona 集合は `.claude/agents/*.md` の frontmatter `name:` から**機械導出**する(実測: 定義済み全数は **14** persona、model ピンは opus 9 / sonnet 5、ピン無し 0)。なお AC-3 の「persona 8」は**現行 corpus に実際に観測された** persona の distinct 数であり、定義済み全数 14 とは母集団が異なる(観測されていない persona 6 種も許可集合には入る)。
- **FR-1b**: 組込型集合は count-free の台帳として保守する(組込型の正本はハーネス側にあり repo から observable でない — RE §4)。台帳はケーシング差(`Explore` vs `explore` — 実測で別値として共存)を明示的に扱う。台帳形式・正規化写像は application-design で確定(Open questions へ)。
- **AC-1**: 許可集合の解決関数は純関数として export され、in-process テストで (i) persona 全数が集合に入る (ii) 台帳の組込型が入る (iii) 未知値が入らない、を固定する。

### FR-2: 型規律ガード — advisory(CAP-1)

- **FR-2a**: 照合は `SUBAGENT_STARTED` / `SUBAGENT_COMPLETED` の**両記録面**で行う(intent-capture Q4=C)。completed 側は現行で必ず発火し、started 側は #2297/#2303 の修正後に発火し始める(本 intent は両欠陥を修正しない — Out of scope)。
- **FR-2b**: Agent Type が許可集合外(ad-hoc 名)または型未指定の正規化産物(`unknown`)のとき、loud な advisory 警告を出す。**fail-closed 拒否はしない**(#2279 代替案2の明示非採用)。`default` は Codex の組込既定型であり集合内(fixture 実測)。
- **FR-2c**: 警告の出力面(audit 警告イベント / stderr advisory / sensor / doctor)は application-design で確定(R-5)。いずれの場合も警告は**実行結果から導出**し(検証劇場 Forbidden)、audit/emit 経路を壊さない(fail-open — NFR-3)。
- **AC-2(SM-1、落ちる実証)**: 許可集合外の型を注入すると警告が発火することを実測する。
- **AC-3(SM-2、両側実証)**: 現行 corpus(全 intent の audit シャード、測定時刻明記)への sweep で、**許可集合内の実測15種(persona 8 + 組込 7)に警告ゼロ**、警告対象(型未指定 `unknown` の実測 69 + 許可集合外の実測 261 イベント)に警告が出ることを確認する。「誤検知」の定義は許可集合内への警告であり、ad-hoc 名・型未指定への警告は誤検知ではなく本件の検出目的そのものである。〔訂正 2026-08-05: 初稿の「16種(persona 8 + 組込 8)」は RE の観測タリーの「組込8」をそのまま写したものだが、その8には `unknown`(normalizeAgentType の fallback = 型未指定)が含まれており、FR-2b が `unknown` を警告対象と定める以上、許可集合には入らない。application-design reviewer i1 の BLOCKER 指摘(台帳7エントリと AC-3 の不整合)を契機に、集計バケツ(観測8種)と許可集合(組込7種)の母集団差として訂正 — `cid:requirements-analysis:fix-diff-independent-reverify` に基づき件数を機械再計算: 警告ゼロ側 = persona 416 + 組込(unknown 除く)228 = 644、警告側 = 69 + 261 = 330、計 974 で総数一致〕

### FR-3: 実効 model 属性の記録(CAP-2)

- **FR-3a**: 実効 model の導出優先順は、intent-capture Q3=D のユーザー承認済み裁定を**逐語で維持**する: **明示指定(`tool_input.model` — Claude Code live 実測で明示時のみ存在)> agent 定義の model ピン(`.claude/agents/*.md`)> セッション継承**。ただしセッション継承は取得不能実測(runtime-attrs.json は observability 未設定・実体不在・読み手0件)により本 intent では解決不能 → **欠落を明示**する段として扱う。**ハーネス供給値(payload `model` — Codex は fixture 0.137.0 実測で供給済み、アダプタは verbatim pipe)をこの順序のどこに置くか(最上位の事実値とするか、明示指定を優先し続けるか)と競合時の意味論は、承認済み裁定の文面に存在しない新層のため application-design へ委譲する**(Open questions 4。pre-approved 分岐: どちらの解でも「解決不能時は欠落明示」と CON-3 の fail-open は不変)。
- **FR-3b**: SUBAGENT_STARTED / SUBAGENT_COMPLETED の registry 定義(`event-registry.ts:612-623` / `:624-632`)に model 属性を **optional** として追加する。欠落時は属性を書かない(空文字や "unknown" の捏造をしない — 欠落の明示は「属性が無いこと」+ 集計側の未解決区分で表現する。表現形は AD で確定)。
- **FR-3c**: `ClaudeCodeHookInput` へ `model?: string` を型宣言する(`[key: string]: unknown` 存在により非破壊 — RE 確認済み)。
- **AC-4(SM-4)**: 導出優先順の各段(明示のみ / ピンのみ / 全欠落、および AD 裁定後のハーネス供給値ケース)の記録内容をテストで固定する。ハーネス供給値は fixture(codex-hook-payloads)を注入して検証する。
- **AC-5**: model を供給しないハーネス(Claude Code live 実測)で属性が欠落として明示され、workflow が継続する(CON-3 の fail-open)。

### FR-4: 集計の機械導出(CAP-3)

- **FR-4a**: audit シャードから型別・model 別の spawn 内訳を**1コマンド**で導出できる。**COMPLETED 単独で動作すること**(STARTED は Claude Code で0件 — RE 実測 60 vs 974。lifetime ペアリング `composeSubagentLifetimes` の採用可否は AD 委譲)。
- **FR-4b**: 集計出力に測定 ref(対象シャード集合・測定時刻)を明記する(audit は追記され続ける移動値 — RE の Architect 訂正 973→974 の教訓、`cid:reverse-engineering:measurement-ref-in-artifacts`)。
- **AC-6(SM-3)**: R-2 の再計測(型別ランキング・許可集合内/外の内訳)をこのコマンドの実出力で示す。

### 利用シナリオ(walkthrough)

conductor が ad-hoc 名(例: `builder-x1`)で subagent を起動すると、SUBAGENT イベント記録時に許可集合照合が走り、集合外のため advisory 警告が可視化される(FR-2)。leader は任意の時点で集計コマンド(FR-4)を実行し、「型別・model 別の spawn 内訳(許可集合内/外の区分、測定 ref 付き)」を1コマンドで得て、規約外起動の量と行き先(#2298 の受け皿設計)を判断する。誤って警告が出ない正常系: 定義済み persona(model ピン付き)で起動 → 警告なし、model 属性は解決順に従って記録される(FR-3)。

## Non-functional requirements(非機能要件)

- **NFR-1(parity)**: 変更は `packages/framework/core/` を正本とし、`bun run build` で全ハーネス(manifest 検出集合)の再生成・追跡ファイル不変を確認する(Mandated)。
- **NFR-2(検証)**: TDD 既定(Red 実測 → 最小実装 → Green の vertical slice)。PR CI のブロッキング集合全体(typecheck / lint / 再現性 / source-only / graph invariant / run-tests --ci / Project+Patch Coverage / complexity / plugin-conformance)を満たす。新設ガードは AC-2 の落ちる実証と AC-3 の corpus sweep 両側実証を完了条件に含める。
- **NFR-3(安全)**: advisory と model 属性の追加は subagent イベントの emit 経路を壊さない — 解決・照合の失敗は警告付き fail-open とし、audit 書込を止めない。
- **NFR-4(スキーマ互換)**: registry の optional 追加は既存イベントの検証(canonical count 等)を破らない。既存 audit 行の遡及書換はしない(append-only)。

## Constraints(制約 — scope-document から転記)

- **CON-1**: `CXR-33` — transcript / last_assistant_message の読取・保存をしない(Q3=D で受容。model 導出に transcript を使わない)。
- **CON-2**: start seam は live で不発(D-1 #2303 / D-2 #2297)— 本 intent はこれに依存しない設計(completed 側で必ず動作)。
- **CON-3**: ハーネス間 parity — 供給できないハーネスで fail-closed に落ちない。
- **CON-4**: 免責が実質基準を代替しない — 「欠落の明示」だけでは SM-4 を満たさない。導出可能な範囲の実装が必須(`cid:requirements-analysis:exemption-clause-must-not-substitute`)。

## Assumptions(前提)

- **AS-1**: Codex の payload `model` 供給は fixture(CLI 0.137.0 捕捉)実測に依拠し、現行 0.146.0 の live は未実測(RE §1)。実装は fixture 契約でテストし、live 差異が出た場合も FR-3a の欠落明示に安全に退化する。
- **AS-2**: Claude Code(2.1.222、実測 2026-08-05)の payload に model が載らない前提は将来のハーネス世代交代で変わりうる — FR-3a の優先順 (1) が自動的に拾う設計とする。
- **AS-3**: Cursor / OpenCode / Kimi / Kiro / Kiro-IDE / Pi の payload の model 有無は未実測(RE §1 残余)— FR-3a は供給があれば拾い、無ければ欠落明示に落ちるためブロッカーではない。

## Out of scope(スコープ外 — 行き先確定済み)

| 項目 | 行き先 |
|---|---|
| D-1(`SUBAGENT_DISPATCH_TOOL` 不一致)の修正 | [#2303](https://github.com/amadeus-dlc/amadeus/issues/2303) |
| D-2(settings drift)の修正 | [#2297](https://github.com/amadeus-dlc/amadeus/issues/2297) |
| 汎用 builder persona の新設 | [#2298](https://github.com/amadeus-dlc/amadeus/issues/2298) |
| `CXR-33` の改訂 / fail-closed 拒否 / 運用上の減少実証 / セッション継承の供給経路新設 | scope-document Out 節どおり |

## Open questions(application-design へ委譲)

1. 警告の出力面(audit 警告イベント / stderr / sensor / doctor)— R-5 / FR-2c
2. 組込型台帳の形式・置き場所・ケーシング正規化写像 — FR-1b(Q7)
3. `gen_ai.request.model`(宣言済み・本番供給0の休眠キー)への同時供給の要否 — Q6(pre-approved: 導入時も fail-open)
4. **ハーネス供給値(payload `model`)の位置づけと競合意味論** — ユーザー承認済みの解決順(明示指定 > persona ピン > セッション継承)に対し、供給値を最上位の事実値とするか明示指定を優先し続けるか(FR-3a。reviewer i1 BLOCKER の是正として要件では確定せず委譲。どちらの解でも欠落明示と fail-open は不変)
5. 欠落明示の表現形(属性不在 + 集計側の未解決区分の語彙)— FR-3b
6. `composeSubagentLifetimes`(消費者0の休眠 seam)の採用可否 — Q9 / FR-4a
7. `name:` 混入機序の live 追試(name: 指定 probe)の要否 — Q8(要件上は不要、設計入力として任意)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-05T16:29:54Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(FR-3a がユーザー承認済み解決順へ『ハーネス供給値』新層を最上位挿入 — 執行を装った設計判断)は、承認済み順序の逐語維持と Open questions 4 への明示委譲(pre-approved 分岐付き)で閉包。是正は AC-4 / AS-1〜3 / FR-3b / CON-3 と整合し新規矛盾なし。FOLLOW-UP 2件(persona 母集団の明示・利用シナリオ節)も解決済み。READY。

### Findings

- NIT | requirements.md Open questions | 節番号の記載順が 1,2,3,7,4,5,6 だった(判定影響なし) | 是正済み: 1〜7 の昇順へ整列
