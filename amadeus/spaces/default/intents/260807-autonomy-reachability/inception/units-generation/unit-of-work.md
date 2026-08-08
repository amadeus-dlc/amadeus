# Unit of Work — autonomy-reachability(#2378)

上流入力(consumes 全数): requirements.md(FR-1〜6 を Unit 境界の親とする)、components.md / component-methods.md / services.md / component-dependency.md / decisions.md(C1〜C7 と ADR-1〜5 を Unit へ束ねる)。stories(user-stories 成果物)は self-feature スコープで user-stories ステージが SKIP のため未生成 — 設計どおりの不在で、story map は FR とペルソナ(intent-statement の Target Customer)から直接構成する。

各 Unit は独立に実装・検証可能な境界で切った(cid:units-generation:c1 (a))。検出と記録のような「片側だけでは価値を出荷できない」境界は同一 Unit に統合済み(u1 の可視化+state 是正、u3 の属性+集計)。

## u1-autonomy-core(kind: service)

- **範囲**: FR-2 全部(C2 canonical 化・refusal イベント emit・preview 列挙・6読み手棚卸しテスト)+C3 縮約。ADR-2/ADR-3
- **境界**: `amadeus-intent-autonomy-production.ts` / `amadeus-bolt.ts`(set-autonomy 縮約)/ `amadeus-audit.ts`+`otel/event-registry.ts`(イベント登録)/ audit-format docs
- **独立実装可能性**: 可 — 既存 verb 契約を変えず内部再配置+観測追加のみ。単独で「set-autonomy 経由でも C13 経由でも state と audit が一貫する」価値を出荷
- **概算規模**: 250〜400行(テスト込み)

## u2-birth-declaration(kind: service)

- **範囲**: FR-1 全部(judgment 0 改訂・Branch 4ab 再配置・`intent-birth --autonomy`・t450×2 明示改訂・e2e)。ADR-1
- **境界**: `amadeus-orchestrate.ts`(C13/Branch 4ab)/ `amadeus-utility.ts`(intent-birth)/ t449・t450 系テスト
- **独立実装可能性**: u1 着地後に可 — birth 直後の mode 反映は u1 の canonical 書込に依存(依存理由: u1 なしでは birth 同時宣言しても state 非対称が残り FR-1d の e2e が偽グリーンになる)
- **概算規模**: 200〜350行(テスト込み)

## u3-question-route-observability(kind: service)

- **範囲**: FR-3 全部(`QUESTION_ANSWERED` 属性追加・迂回検出の集計可能化)。ADR-4
- **境界**: `amadeus-log.ts` のみ(+テスト)。sensor 化可否は functional-design 裁定(AD で明示委譲済み)
- **独立実装可能性**: 可 — 属性追加は後方互換で単独出荷可能
- **概算規模**: 100〜200行(テスト込み)

## u4-conduit-parity(kind: service)

- **範囲**: FR-5 全部(SKILL.md 6面+commands 2面+utility help+README+docs/reference/24 対訳+stage-protocol semi 手順+SKILL :248 整合+パリティ回帰テスト)。ADR-5
- **境界**: `packages/framework/harness/*` 正本群 / `packages/framework/core/amadeus-common/protocols/stage-protocol.md` / docs / 新設テスト1本
- **独立実装可能性**: u2 着地後に可 — 導線は birth 同時宣言の手順を記載するため(FR-5e: 導線だけ先行すると「書いてあるのに動かない」導線になる)
- **概算規模**: 文書 300〜500行+テスト 100〜150行

## u5-measurement-report(kind: spec)

- **範囲**: FR-4(回帰計測レポート — ベースライン C1/C3、新イベント述語、計測 ref 明記)
- **境界**: record 内レポート成果物のみ(コード変更なし — AD の FR-4 N/A 注記どおり)
- **独立実装可能性**: u1・u2・u3 着地後に可 — 新イベント形が揃って初めて適用後計測が成立
- **概算規模**: 150〜250行(レポート本文 100〜150行+repo 外 scratch の計測スクリプト 50〜100行 — Review iteration 1 BLOCKER 是正: 数値レンジで記録)

## u6-plugin-docs-drift(kind: spec)

- **範囲**: FR-6(formal-model-check / pr-convergence の stage 文書の drift 是正)
- **境界**: `plugins/*/stages/*.md` 2ファイルのみ
- **独立実装可能性**: 完全独立(Should — D1 裁定)
- **概算規模**: 20〜40行

## Construction 成果物の適用

kind=service の4 Unit(u1〜u4)は functional-design 〜 code-generation の全成果物が適用される。kind=spec の2 Unit(u5・u6)は文書成果物のみ(engine の produces_kinds 解決に従う — cid:nfr-design:c1-engine-produces-all-five)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T14:54:56Z
- **Iteration:** 1
- **Scope decision:** none

境界・DAG・kind・被覆は健全。BLOCKER 1件: u5 の規模が数値でない(inception.md Mandated 違反)。Minor 1件: 交差目録の docs 面欠落

### Findings

- BLOCKER | unit-of-work.md:35-40 — u5 の概算規模が成果物点数のみで行数見積りなし(inception.md の数値必須ガードライン違反)
- NIT | unit-of-work-dependency.md:38-47 — u1 の audit-format docs 面が交差目録に不記載(u4 との docs 交差の判定材料欠落 — DAG 直列で実害なし)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T14:56:22Z
- **Iteration:** 2
- **Scope decision:** none

BLOCKER(u5 数値規模)+NIT(交差目録 docs 面)ともクローズ確認。yaml edge block・Unit 境界は無変更で整合維持

### Findings

- None
