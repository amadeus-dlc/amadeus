# Security Design — U1 protocol-core

**Intent**: 260810-grilling-frontier-resync / **Stage**: nfr-design / **Unit**: protocol-core (spec)

上流入力(consumes 全数): engine directive の解決済み consumes は空 — 本スコープ(self-feature)は nfr-requirements を SKIP するため、stage frontmatter が宣言する `security-requirements` / `tech-stack-decisions`(および performance/scalability/reliability-requirements)は `consumes_absent`(`expected: true` = 設計上の不在)。stage-protocol の規定どおり fallback として `requirements.md`(FR-PROTO-1/2、FR-CONTRACT-2/4、FR-PROJ-4)と U1 functional-design の `business-rules.md`(BR-U1-1/6/7)・`domain-entities.md`(マーカー・記録行の型)を設計出典として実参照する。欠落成果物の内容は発明しない。

## 脅威面の同定(spec kind — 実行体なし)

U1 は protocol/skill markdown の配布物であり、常駐サービス・API・認証主体を持たない。適用される脅威面は次の3つに限る。

1. **供給元完全性(supply chain)** — 上流 mattpocock/skills の骨格テキストを取り込む。改竄・無断改変は「骨格が上流と同一である」という帰属主張自体を偽にする。
2. **機械可読マーカーの入力面** — questions ファイルへ書かれる grilling マーカー(`<!-- amadeus-grilling:v1 mode=grilling -->`)と超過記録行(justification 行)は、下流 U2 センサーと既存 answer-evidence 述語が機械照合する。語彙が既存述語と交差すると、回答証跡の偽装・検査の無音空文化(vacuity)という完全性侵害になる。
3. **記録内容の秘匿** — 超過記録行が questions ファイル(バージョン管理対象)へ何を書くか。

## 設計(各面の統制)

### 1. 供給元完全性 — SHA ピン+byte 不変+ライセンス保存

- 骨格ブロックは begin マーカーの `upstream=1495d014303e041c51c29f9e442485ba06f5878d` 属性で上流コミットへ帰属し(business-rules.md BR-U1-1、FR-PROTO-2)、マーカー間テキストはピン原文と byte 同一(sha256 照合、FR-PROTO-1)。改変検出は「diff 空」の機械検査であり、目視レビューに依存しない。
- 既存 MIT ライセンスヘッダ本文は変更しない(BR-U1-1)— 帰属表示の保存はライセンス遵守面の統制でもある。
- 配布はコード署名等の新規機構を導入せず、既存の build 再生成+source-only 境界検査+隔離2回ビルド(requirements.md FR-PROJ-4)に乗る — 新規配布面を作らないこと自体が攻撃面の不拡大statement である。

### 2. マーカー入力面 — 語彙非交差と fail-open 禁止

- マーカー・記録行の語彙は既存機械述語(`[Answer]:` の ANSWER_TAG_RE、「承認」行走査、質問カウント述語)と非交差のトークンで構成する(BR-U1-6、検査面の固定は U2 の BR-U2-4 が所掌)。交差すると answer-evidence 検査の偽装経路(検証劇場)が開くため、非交差はテストで固定される。
- 記録行の様式は固定1行形(`<!-- amadeus-grilling:justification depth=<Depth> questions=<N> frontier-driven -->`)で、自由文を含まない — 機械照合は verbatim 一致であり、部分一致・正規表現の緩い受理による偽装余地を設計段で除去する。異形は「無音通過」でなく loud finding(fail-open 禁止 — 検査側 U2 の既決契約と対)。検査側の判定が単一ゲート点で cutoff を適用し fail-closed 縮退する構造は、sibling unit(budget-sensor)の `business-logic-model.md`(判定フロー Phase 3→4 と cutoff 迂回路の不在)を設計出典として参照する — U1 の書き側様式と U2 の検査側判定が同一トークンを write⇔check の対で共有することが、本節の完全性統制の成立条件である(本 unit(spec kind)は business-logic-model を自らは産まないため、sibling の同名成果物が正本)。
- protocol prose 自体は instruction 供給面だが、subagent 出力・ツール結果内の指示風テキストを実行しない既存規範(team.md instruction-like-text-rejection)が会話面の統制として既に存在し、本 unit は新規の実行面を追加しない。

### 3. 記録内容の秘匿 — 最小記録

- 超過記録行が questions ファイルへ書くのは depth 名・質問数・固定語 `frontier-driven` のみ(domain-entities.md の型)。ユーザー回答本文・環境情報・path は記録しない — 記録の最小化により、バージョン管理される record への新たな機微情報クラスの導入をゼロに保つ。

## 非適用の明示

- **認証・認可・セッション管理・暗号化(at rest / in transit)・CSRF/XSS・secrets 管理・audit logging(新規導入面として)**: 非適用 — U1 は実行体・ネットワーク境界・保存データストアを持たない(components.md の C1/C2/C5 は md 文書のみ。unit-of-work.md「Deployment model: N/A — 配布物」)。要件を薄める判断ではなく、対象が存在しない構造的非適用である(CLI/library の NFR に常駐サービス向けパターンを機械適用しない — project.md cid:nfr-design:c1)。
- 上記に対応する宣言済み security requirement は存在しない(nfr-requirements SKIP)— 本設計は requirements.md の FR 群を唯一の上流とし、独自の要件 id を発明しない。

## 検証への接続

- 骨格 byte 不変・SHA 1 hit・語彙非交差・記録行 verbatim は、U1 完了条件(unit-of-work.md)と U2 のセンサーテスト(FR-CONTRACT-4)が機械検証する — 本設計はそれらの検査が守る性質を security 観点から命名したものであり、新規の検証機構は追加しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T08:12:50Z
- **Iteration:** 1
- **Scope decision:** none

READY(GoA 1): security-design.md は nfr-design ステージ契約(Step 5/6)に適合。consumes 空(nfr-requirements SKIP、consumes_absent expected:true)を上流入力ヘッダが正確に反映し、requirements.md の FR id と U1 FD の BR id を fallback 出典として実参照(装飾トークンでない)。spec kind の produces 枝刈り(security-design.md のみ)に整合。要件 id の発明なし、既存機構への reuse のみで新規機構なし、全称断定なし、H2 4節。FOLLOW-UP 3件のうち audit logging の非適用明示は conductor が同一ターンで反映済み。

### Findings

- FOLLOW-UP | 非適用の明示に audit logging を名指しで追加 — 反映済み
- FOLLOW-UP | 既決参照の様式が BR-id/FR-id 主体で厳密な file:line でない — 様式精密化の余地(FD 側成果物はスコープ外につき実在未検証の限界を開示)
- NIT | sibling business-logic-model.md への依存記述の1文が長い — 可読性の文分割余地
