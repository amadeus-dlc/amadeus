# Units of Work

**上流入力(consumes 全数)**: `components`(C-1〜C-7 の一覧と規模 — Unit への割付元)/ `component-methods`(各 Unit のメソッド契約とテスト割付)/ `services`(fail-open・配布・スキーマ互換の運用契約 — 全 Unit 共通の受け入れ条件)/ `component-dependency`(依存グラフと Bolt 分割への示唆 — 本書の分割根拠)/ `decisions`(ADR-1〜7 — 各 Unit の設計拘束)/ `requirements`(FR/AC — 各 Unit の完了条件)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 分割方針

`cid:units-generation:c1` に従い各 Unit は独立に実装可能で、単独で利用者価値(検出・可観測化・集計のいずれか)を出荷する。検出と記録のように片側だけでは価値を出せない境界は同一 Unit に統合した(U1 が純関数層と completed 配線を併せ持つのはこのため)。walking-skeleton 態勢(project.md § Walking Skeleton — self-feature は最初の Bolt を最小 e2e スライスとしてゲート)を U1 が担えるよう、U1 単独で「規約外 spawn → 警告」の end-to-end が成立する。

## U1: 型規律ガードの最小 e2e スライス(detection-skeleton)

- **kind**: `library`
- **範囲**: C-4(組込型台帳)+ C-1(許可集合解決)+ C-2(型 verdict 分類)+ C-6 の一部(`Type Verdict` optional 追加)+ C-5 completed 側配線(`amadeus-log-subagent.ts` — 照合・advisory・fail-open)
- **価値**: 規約外・型未指定の spawn が completed 面で即時に警告され、`Type Verdict` が audit に残る(FR-1 / FR-2 の completed 半面)
- **完了条件**: AC-1(純関数の in-process テスト)、AC-2(落ちる実証 — 集合外注入で警告発火)、completed 面の fail-open テスト
- **推定規模**: 〜120行 + テスト(components.md の C-1/C-2/C-4 + 配線半分 + registry 1行)
- **設計拘束**: ADR-1(属性 + stderr)、ADR-2(完全一致・7エントリ台帳)

## U2: 実効 model 属性と started 面(model-attribution)

- **kind**: `library`
- **範囲**: C-3(model 解決)+ C-6 の残り(`Model` / `Model Source` optional 追加)+ C-5 の model 配線(completed 面)と started 側配線(`subagentStartFields` — Type Verdict / Model 両属性。kimi 経路で発火、#2303 未修正の Claude Code では休眠)
- **価値**: spawn ごとの実効 model と解決元が audit に残る(FR-3)。started 面の照合コードが将来の #2303/#2297 着地で自動的に生きる(intent-capture Q4=C)
- **完了条件**: AC-4(4ケース: harness / request / pin / unresolved — Codex fixture 注入含む)、AC-5(供給なしハーネスで欠落明示 + emit 継続)
- **推定規模**: 〜110行 + テスト
- **設計拘束**: ADR-3(観測値 > 要求値 > 宣言値、source 併記)、ADR-5(欠落 = 属性不在)
- **依存**: U1(新設モジュール・registry 追加様式・fail-open ヘルパを再利用)

## U3: 集計 CLI(subagent-stats)

- **kind**: `service`
- **範囲**: C-7(`amadeus-subagent-stats.ts`)
- **価値**: 型別・verdict 別・model 別の spawn 内訳を1コマンドで導出(FR-4)。R-2 の再計測を実演
- **完了条件**: AC-3(corpus sweep 両側実証 — 許可集合内15種に警告ゼロ / 警告対象 330± に警告)、AC-6(実出力に測定 ref + unresolved 区分)
- **推定規模**: 〜120行 + テスト
- **設計拘束**: ADR-5(属性不在 = unresolved)、ADR-6(COMPLETED 単独タリー)
- **依存**: U1(`classifyAgentType` を import して旧行を集計時分類)。U2 とは独立(Model 属性が無い行は unresolved として動作)

## Unit 横断の共通契約

- 全 Unit: TDD 既定(NFR-2)、`bun run build` での全ハーネス再生成(NFR-1)、emit 経路の fail-open(NFR-3)、registry optional のみ(NFR-4)
- U1 と U3 の corpus sweep 数値(15種 / 330 = unknown 69 + outside 261 / 総計 974)は requirements AC-3 の訂正注記の機械再計算値を正とし、実測時刻で再確定する(audit は移動値)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T21:39:19Z
- **Iteration:** 1
- **Scope decision:** none

3成果物は整合。C-1〜C-7 は U1(C-1/C-2/C-4/C-5completed/C-6一部)・U2(C-3/C-5残り/C-6残り)・U3(C-7)へ全数割付、AC-1〜AC-6 も一意割付(AC-1/2→U1、AC-4/5→U2、AC-3/6→U3)。依存エッジ(U2→U1、U3→U1、U3⊥U2)は AD の C 依存と ADR-5/6 に接地し、隠れた依存なし。U1 は walking-skeleton として単独 e2e 成立。kind 割当妥当。BLOCKER なし。

### Findings

- FOLLOW-UP | unit-of-work.md | ステージ契約は unit-of-work.md 本文への kind 明記を要求するが U1〜U3 の節に kind: が無かった(情報は dependency 文書に実在) | 是正済み: 各 Unit 節へ kind 行を追加しセンサー再発火 PASSED
- NIT | unit-of-work.md | Unit 規模合計(〜350行)と components.md 合計(〜300行)の差は見積り粒度の差で実質矛盾なし | 両者ともテスト行を含まない注記あり
