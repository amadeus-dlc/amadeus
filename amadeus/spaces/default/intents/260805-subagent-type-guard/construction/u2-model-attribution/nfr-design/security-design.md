# U2 model-attribution — Security Design

**上流入力(consumes 全数)**: `business-logic-model`(U2 の model 解決フロー・面ごとの入力差 — 本書の設計対象)。条件解決で除外された consumes(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は nfr-requirements SKIP による設計上の不在(directive の `consumes_absent` expected: true)。セキュリティ統制は requirements の CON(CON-1 transcript 非接触)と検証劇場 Forbidden から導出する。

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 入力検証と値の取り扱い

- **model 値の由来別信頼度**: `harnessModel`(payload)と `requestedModel`(tool_input)は外部由来の任意文字列、`personaPin` は repo 管理の宣言値 — 3入力とも trim 規約は FD 既決(**出典: U2 functional-design の domain-entities「ModelResolutionInput」節 — 逐語「空白のみの文字列は undefined と同義に扱う(`normalizeAgentType` と同じ trim 規約)」、テスト契約は BR-U2-7 の「空白 trim」**)。意味論も FD のまま: trim して空になる値は undefined と同義 = 先勝ち判定の対象外(3入力すべて空なら `unresolved` — 空文字が resolved として記録される経路は存在せず、Model/Model Source の対書き不変条件と干渉しない)。属性値はそのまま audit 行(JSON)に入るため、既存 emit 経路の JSON エンコードが構造注入を防ぐ(手組み文字列連結をしない)
- **Model Source の閉語彙**: `"harness" | "request" | "pin"` の3値のみ(ModelSource union)— 由来の捏造・任意文字列化を型で排除。`unresolved` は「属性を書かない」ことで表現し、`"unknown"` 等のプレースホルダ値を audit に発明しない(FR-3b — 記録の真正性)
- **frontmatter `model:` 読取**(resolvePersonaPin): C-1 と同じ宣言的読取のみ — 値の実行・展開なし。`name:` 一致による引き当て(basename 決め打ち禁止)は path traversal の余地も消す(`agentType` を path 構成に使わない)

## 権限とデータ境界

- **新設書込なし**: U2 の追加はいずれも既存 audit emit への optional 属性(`Model` / `Model Source`)のみ。stderr warnings は診断出力であり永続化しない
- **CON-1**: started 面の入力は `payload.model` / `tool_input.model` のフィールド読取のみ — prompt / transcript 本文には触れない
- **秘匿情報**: model 識別子(例 `openai.gpt-5.5`)は非秘匿のメタデータ — 資格情報・API キーを扱う経路なし。persona frontmatter からは `name:` と `model:` の2フィールドのみ読む

## 監査整合性

- **対書き不変条件**: `resolved` なら `Model` と `Model Source` を必ず対で書く(ADR-5)— 片方だけの行を作らないことで、読み手(U3)の解釈が単純化し、対欠落の観測自体が上流契約違反の loud なシグナルになる
- **source 併記による情報非損失**: 優先順(harness > request > pin)を将来変更しても、過去行は `Model Source` により解釈が保存される(監査の時点独立性)
- **fail-open**: pin 読取・解決層で throw された例外は、**配線点ごとの外周 catch**(started 面 = `subagentStartFields` 内の差し込み部、completed 面 = `amadeus-log-subagent.ts` の差し込み部 — 2配線点に各1つ、片面だけの catch は NFR-3 を片面でしか満たさない)の動的スコープ内で吸収され emit 継続(BR-U2-6 の二層)。保証範囲は catch スコープ内の throw に限る — catch ハンドラ自身の失敗・emit 後の失敗・プロセス級の異常終了は本統制の外(emit 層は U2 不変のため既存挙動)

## コンプライアンス統制

- registry 追加は optional のみ(NFR-4)— 既存読み手の schema 互換を維持
- ネットワーク境界・暗号化対象・認証フローは存在しない(ローカル FS 読取 + プロセス内解決のみ)— 該当統制は N/A(根拠: business-logic-model のモジュール構成に I/O は node:fs のみ)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T22:47:53Z
- **Iteration:** 2
- **Scope decision:** none

i1 の BLOCKER(trim の誤出典 — business-logic-model 入力差表に不在)は FD 正本(domain-entities ModelResolutionInput 節 + BR-U2-7)への出典訂正と unresolved 意味論の明記で閉包(逐語照合成立)。catch 配線点2箇所の1:1 規定・全称断定の保証範囲限定・registry 内訳注記も閉包し、新規矛盾なし。READY。

### Findings

- NIT | logical-components.md:14 | registry 増分内訳は U1 着地状態への条件分岐 — 実装時に event-registry.ts の実件数を再実測して確定(成果物側で閉じられない指摘のため NIT 止まり)
