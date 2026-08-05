# Application Design — Components

**上流入力(consumes 全数)**: `requirements`(FR-1〜FR-4・AC-1〜6・Open questions 1〜7 — 本書の全コンポーネントの導出元)/ codekb `architecture`(subagent 観測パイプラインの現在断面と患部座標 — 既存コンポーネントとの整合節の出典)/ codekb `component-inventory`(core tools / hooks / otel の既存構成 — 再利用棚卸しの出典)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 設計方針の要約

追加するのは「照合・解決の純関数層」と「その配線」だけである。hook の emit 経路(既存)に対し、(1) Agent Type の許可集合照合と (2) 実効 model の解決を**純関数**として差し込み、結果を同一イベントの optional 属性として記録する。新しいイベント種・デーモン・レジストリは作らない(Construction phase 原則「canonical 1定義から導出」、`cid:nfr-design:c1` — CLI/ライブラリに常駐 service の機構を持ち込まない)。集計は audit シャードを読む小さな読み取り専用 CLI を1本新設する。

## 新規コンポーネント一覧(規模の正当化 — 数値必須)

| # | コンポーネント | 置き場所 | 推定規模 | 種別 |
|---|---|---|---|---|
| C-1 | `resolveAllowedAgentTypes`(許可集合の解決) | `packages/framework/core/tools/amadeus-subagent-observability.ts`(新設モジュール) | 〜40行 | 純関数 |
| C-2 | `classifyAgentType`(型 verdict の分類) | 同上 | 〜30行 | 純関数 |
| C-3 | `resolveEffectiveModel`(実効 model の解決) | 同上 | 〜50行 | 純関数 |
| C-4 | `BUILTIN_AGENT_TYPES`(組込型台帳) | 同上 | 〜20行 | データ(count-free) |
| C-5 | hook 配線(started / completed 両面) | `amadeus-lib.ts` `subagentStartFields` + `core/hooks/amadeus-log-subagent.ts` の既存関数へ差し込み | 既存2ファイルへ 〜30行 | 配線 |
| C-6 | registry 更新(optional 属性の追加) | `core/otel/event-registry.ts:612-632` | 〜6行 | データ |
| C-7 | `amadeus-subagent-stats.ts`(集計 CLI) | `packages/framework/core/tools/` | 〜120行 | 読み取り専用 CLI |

合計推定 〜300行(テスト別)。intent に規模バジェットの指定なし。

## 各コンポーネントの責務と境界

- **C-1 resolveAllowedAgentTypes**: `.claude/agents/*.md` の frontmatter `name:` を読んで persona 集合を機械導出し(FR-1a)、C-4 の組込型台帳と合成して許可集合(`ReadonlySet<string>`)を返す。I/O はディレクトリ読取のみで、読取失敗は空 persona 集合 + 警告付き fail-open(NFR-3)。
- **C-2 classifyAgentType**: `(agentType, allowedSet) => TypeVerdict`。判別 union `TypeVerdict = "persona" | "builtin" | "unknown-type" | "outside-allowed-set"` を返す純関数。`unknown`(normalizeAgentType の fallback 産物)は `unknown-type`、集合外は `outside-allowed-set`(FR-2b)。ケーシングは**完全一致**で扱う(ADR-2)。
- **C-3 resolveEffectiveModel**: `(payload, personaPins) => ModelResolution`。判別 union `ModelResolution = { kind: "resolved", model, source: ModelSource } | { kind: "unresolved" }`、`ModelSource = "harness" | "request" | "pin"`。導出順は ADR-3 のとおり(観測値 harness > 要求値 request > 宣言値 pin)。source を必ず併記するため情報は失われない(parse-don't-validate — 解決済みであることを型で運ぶ)。
- **C-4 BUILTIN_AGENT_TYPES**: 逐語の組込型リテラル配列(count-free — 件数コメントを持たない。`cid:code-generation:count-comment-sync-on-catalog-change`)。RE 実測の観測語彙から **`unknown` を意図的に除外した7種**を初期値とする — `unknown` は `normalizeAgentType` の fallback(= 型未指定の正規化産物)であり、FR-2b が警告対象と定めるため許可集合に入れない(RE の観測タリー「組込8」は集計バケツであって許可集合ではない — requirements AC-3 の訂正注記を参照)。ケーシング違い(`Explore` / `explore`)は**別エントリとして両方収載**する。
- **C-5 hook 配線**: started 側は `subagentStartFields`(`amadeus-lib.ts:4128-4139`)、completed 側は `amadeus-log-subagent.ts:50-52` 近傍で C-2 / C-3 を呼び、結果を `Type Verdict` / `Model` / `Model Source` の optional 属性としてフィールド集合へ足す。集合外・型未指定のとき **stderr へ advisory 1行**を出す(ADR-1。呼び出し点数は実装時に grep 実測 — `cid:code-generation:guard-announcement-callsite-count`)。照合・解決の throw は catch して警告付き fail-open(emit は必ず継続 — NFR-3)。
- **C-6 registry 更新**: `SUBAGENT_STARTED`(`event-registry.ts:612-623`)/ `SUBAGENT_COMPLETED`(`:624-632`)の optional 列へ `"Type Verdict"` / `"Model"` / `"Model Source"` を追加。required は触らない(NFR-4)。
- **C-7 amadeus-subagent-stats**: audit シャード(glob は既存 audit 読取 CLI の様式に従う)を読み、`SUBAGENT_COMPLETED` を一次入力として型別・verdict 別・model 別のタリーを出力する(FR-4a)。`SUBAGENT_STARTED` が存在すれば併記。出力冒頭に測定 ref(シャード数・イベント数・測定時刻)を必ず印字(FR-4b)。書込ゼロの読み取り専用。

## 既存コンポーネントとの整合(再利用棚卸し)

| 既存 | 扱い |
|---|---|
| `normalizeAgentType`(`amadeus-lib.ts:4082-4084`) | **不変**。形の正規化は従来どおり。C-2 はその出力を受ける後段 |
| `subagentStartFields` / `amadeus-log-subagent.ts` | 差し込み先(C-5)。`SUBAGENT_DISPATCH_TOOL` の不一致(#2303)は触らない — completed 側が主経路 |
| `composeSubagentLifetimes`(`subagent-lifetime.ts:112`、消費者0) | **本 intent では採用しない**(ADR-6)。C-7 は COMPLETED 単独タリーで FR-4 を満たす。lifetime ペアリングは STARTED が実質0件(Claude Code)の現状で価値が乗らず、#2303/#2297 着地後の別 intent で再評価 |
| `gen_ai.request.model`(`resource-suppliers.ts:24`、宣言済み・本番供給0) | **本 intent では供給しない**(ADR-4)。resource はセッション粒度で subagent 粒度に合わない |
| `amadeus-norm-metrics.ts` / `amadeus-loop-monitor-runtime.ts` | audit を読む CLI の既習様式として C-7 の実装参照 |
| `.claude/agents/*.md` frontmatter | C-1 の入力(既存資産の読取のみ) |

## 上流トレーサビリティ

C-1/C-4 → FR-1(AC-1)、C-2/C-5 → FR-2(AC-2/AC-3)、C-3/C-5/C-6 → FR-3(AC-4/AC-5)、C-7 → FR-4(AC-6)。Open questions 1〜6 の裁定は `decisions.md` の ADR-1〜ADR-6。Open question 7(name: 混入機序の live 追試)は不実施と裁定(ADR-7)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T16:54:45Z
- **Iteration:** 2
- **Scope decision:** none

i1 の BLOCKER 2件を閉包: 件数不整合は3成果物 + cross-stage 訂正(requirements AC-3)で『persona 8 + 組込7 = 15種 / 警告対象 330 = unknown 69 + outside 261 / 総計 974』の単一機械再計算値に統一(644+330=974 の総和照合済み)。Reversibility は全7 ADR に実在。FOLLOW-UP(ADR-3 の C10 定義・ADR-4/7 の代替2案化)も反映。新たな矛盾なし。READY。

### Findings

- FOLLOW-UP | requirements.md | AC-3 の cross-stage 訂正(16種→15種、警告側 330)を実施 — RA 承認後の遡及編集のため訂正注記と機械再計算を本文に固定済み | i1 BLOCKER 1 の根本が要件数値にあったため
- NIT | decisions.md | Reversibility 行の追加は全7 ADR で『可逆』判定 — locked-in 判定の ADR がゼロであることは設計が薄い兆候ではなく、optional 属性 + 純関数 + 読み取り専用 CLI という構成の帰結 | i2 で grep 照合済み
