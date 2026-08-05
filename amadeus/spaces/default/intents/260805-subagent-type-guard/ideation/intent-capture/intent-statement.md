# Intent Statement — subagent 型規律ガードと実効 model 属性の記録

**上流入力(consumes 全数)**: なし(intent-capture は最初のステージであり `consumes: []`)

**測定 ref**: `7060956c5617125dd2f4e284957aa180cb306484`(= `origin/main`、ブランチ `260805-subagent-type-guard`)。
本書に載せた file:line と件数はすべてこの ref での実測に由来する。

**起点**: GitHub Issue [#2279](https://github.com/amadeus-dlc/amadeus/issues/2279)(Issue-first、`enhancement` / P2)
**Mirror Issue**: [#2288](https://github.com/amadeus-dlc/amadeus/issues/2288)
**クロスレビュー**: 2名成立 — [reviewer-1](https://github.com/amadeus-dlc/amadeus/issues/2279#issuecomment-5192525965) / [reviewer-2](https://github.com/amadeus-dlc/amadeus/issues/2279#issuecomment-5192526462)、収束結果 `REFRAME_REQUIRED`

## Problem Statement(解決する問題)

サブエージェントの起動は、監査記録の上で**型が検査されず、モデルが記録されない**。

1. **型の許可集合照合が実行時 spawn 経路に存在しない。** `normalizeAgentType`
   (`packages/framework/core/tools/amadeus-lib.ts:4082-4084`、逐語
   `return raw?.trim() ? raw : "unknown";`)は**形の正規化のみ**を行い、値がどの集合に属するかを見ない。
   呼び出しは開始側 `amadeus-lib.ts:4133` と完了側
   `packages/framework/core/hooks/amadeus-log-subagent.ts:50` の2箇所で、いずれも所属検査を持たない。
   compile 時には stage frontmatter のエージェント名照合が存在する(`amadeus-graph.ts:2191,2218`)が、
   これは別物であり実行時の spawn を守らない。
2. **SUBAGENT イベントに model 属性が無い。** `subagentStartFields`(`amadeus-lib.ts:4127-4140`)が
   構成するのは `Agent Type` / `Agent ID` / `Purpose` の3フィールドのみ。

この2点の帰結として、定義済み persona(model ピン付き)を経由しない ad-hoc な spawn が
**無音で成立し、事後にモデルを確認できない**。`team.md` の
`cid:requirements-analysis:subagent-utilization` が定める「高判断=opus」の配分方針は、
prose の規律としてのみ存在し、機械的な裏付けを持たない。

### 問題の規模(実測)

reviewer-1 が target SHA で再計測した内訳: 型未指定は **199件**(`default` 136 + `unknown` 63)で、
その **100% が `SUBAGENT_COMPLETED` 行**。`SUBAGENT_STARTED` は単一 intent
`260801-tla-multi-model` 由来の60件のみで、型は `coder`(33)/ `explore`(27)。

> Issue 本文の「completed 992件中 default 136 / unknown 88」は target SHA で再現せず、
> 出典として挙げられた intent `260805-docs-impl-sync` は実在しない。両レビュアーが独立に
> 再現不能と判定した(C4 = REFINED)。**再計測と測定 ref の明記を requirements で行う。**

## Target Customer(誰が便益を受けるか)

- **Amadeus を運用するチーム** — 規約外の起動が起きた事実をその場で知れる。現在は無音で通過する。
- **コスト・品質を監査する leader** — 型別・モデル別の spawn 内訳を機械的に導出できる。
  現在は audit に生値の型しか無く、モデルは記録されていないため事後確認の手段がない。
- **将来の intent の conductor** — 「どの型で起動すべきか」が検査によって可視になる。

## Success Metrics(測定可能な成功指標)

Q2 の裁定(C)により、**検出の即時性と事後集計の両方**を満たすことを完了条件とする。

| # | 指標 | 判定方法 |
|---|------|----------|
| SM-1 | 型未指定または許可集合外の Agent Type で subagent が記録されたとき、loud な警告(advisory)が出る | 集合外型を注入して警告の発火を実測する(落ちる実証) |
| SM-2 | 正当な型(定義済み persona + ハーネス組込型)では警告が出ない | 現行コーパス全数への sweep で誤検知ゼロを実測する |
| SM-3 | 任意の期間について型別・モデル別の spawn 内訳を機械導出できる | audit / otel から1コマンドで集計を出す |
| SM-4 | model 属性は解決可能な範囲で記録され、解決不能な場合は欠落が**明示**される | 解決順ごとの記録内容をテストで固定する |

**完了条件に含めないもの**: 集合外 spawn の件数が運用で実際に減ったこと(Q2 の選択肢 D)。
これは本 intent の完了を運用期間に依存させるため、運用後の観測(次のローリング PM の題材)に置く。

## Initiative Trigger(なぜ今か)

- **技術的負債の顕在化** — ad-hoc 名(`builder-*` / `reviewer-*` / `pr2200-*` 等)での起動が
  実測で多数観測され、prose 規律の限界が示された(Issue 本文の代替案1の非採用理由)。
- **同根の欠陥が併存** — `packages/framework/core/otel/resource-suppliers.ts:22-27` の
  `SUPPLIED_RESOURCE_KEYS` は `gen_ai.request.model` を供給可能キーとして**宣言済みだが、
  本番コードからの供給呼び出しはゼロ**(テスト内のみ)。宣言と実装の乖離が既に存在する。
- **観測面の drift** — live `.claude/settings.json` に `PreToolUse` エントリが無く、
  `amadeus-log-subagent-start.ts` がどこからも呼ばれていない(`.claude/settings.json.example:60-66`
  には存在)。開始側の記録が実質停止している。

## Initial Scope Signal

- **スコープ**: `self-feature`(Amadeus 自体への新機能追加。`project.md` § Scope Overrides)
- **含む**: (a) Agent Type の許可集合照合(**advisory** — fail-closed 拒否は Issue が明示的に非採用)、
  (b) SUBAGENT イベントへの model 属性の付与と集計の機械導出
- **含まない**: (c) 汎用 builder 用の定義済み型(model: opus ピン)の新設 — Q1 の裁定により**別 Issue**。
  実際の型内訳を測ってから受け皿を設計するほうが根拠を持てるため。
- **含まない**: `CXR-33`(`260713-swarm-driver-migration/construction/codex-native-driver/functional-design/business-rules.md:58`
  — `agent_transcript_path` 等の読取・保存を confidentiality failure と定める)の改訂。
  Q3 の裁定により本 intent では触らない。
- **含まない**: `.claude/settings.json` と `.example` の drift 是正 — Q4 の裁定により**別 Issue**。

## 確定済み裁定(intent-capture 質問票より)

| # | 裁定 | 承認 |
|---|------|------|
| Q1 | (a)+(b) のみを完了範囲とし、(c) 汎用 builder persona は別 Issue へ回す | 2026-08-05T13:33:00Z |
| Q2 | 成功指標は検出の即時性と事後集計の両方。再発抑止の実証は運用後の観測 | 2026-08-05T13:33:00Z |
| Q3 | model は解決順(明示指定 > agent 定義の model ピン > セッション継承)で決まる範囲を記録し、解決不能は欠落を明示。CXR-33 は触らない | 2026-08-05T13:40:00Z |
| Q4 | ガードは `SUBAGENT_STARTED` / `SUBAGENT_COMPLETED` の**両記録面**に置く。settings drift 是正は別 Issue | 2026-08-05T13:40:00Z |

## 下流へ引き継ぐ未解決事項(`REFRAME_REQUIRED` の内訳)

クロスレビューの収束結果は `REFRAME_REQUIRED` であり、欠陥の実在は両者一致で確認されたが、
Issue の期待結果1・2は記載のままでは成立しない。以下を後続ステージで固定する。

| # | 未解決事項 | 裁定先 |
|---|-----------|--------|
| R-1 | **model の供給源の一意確定** — Claude Code / Codex それぞれの live payload に `model` が実際に載るか。reviewer-2 は Codex の **fixture**(`tests/fixtures/codex-hook-payloads/payloads.json:91-98`)を根拠に肯定、reviewer-1 は本番供給呼び出しの不在を根拠に否定(C10 の不一致)。fixture は live payload の証明ではなく、reviewer-1 は read-only のため live ダンプ不能と自ら明記している | **RE(2.1)の scan 段**(`cid:reverse-engineering:c1-xrev-mechanism-resolution`) |
| R-2 | C4 の集計値の再計測と測定 ref の明記、出典 intent 名の訂正 | requirements-analysis(2.3) |
| R-3 | 「実効 model」の定義固定 — `明示指定 > agent 定義の model ピン > セッション継承` の解決結果であり単一フィールドの複写ではない。各段の取得可否を実測で固定する | RE(2.1)→ requirements-analysis(2.3) |
| R-4 | 許可集合の正確な定義 — 「ハーネス組込型」の実際の語彙(`explore` / `coder` 等)を実測で列挙する | RE(2.1) |
| R-5 | advisory の出力面(audit 警告イベント / stderr / sensor / doctor のいずれか) | application-design(2.6) |

> R-1 の裁定を requirements より前の RE に置くのは、`project.md`
> `cid:reverse-engineering:c1-xrev-mechanism-resolution`(2名の verdict が機序で食い違った場合の裁定先は
> RE の scan 段。クロスレビューが担うのは欠陥の実在であって機序の一意確定ではない)に従うため。
