# NFR Design: セキュリティ設計 — U2 applicability-hold

上流入力(consumes 全数): 本 unit の解決済み consumes は `business-logic-model.md`(U2 functional-design、READY 確定)。`security-requirements` / `tech-stack-decisions` は nfr-requirements SKIP による expected-absent(設計どおりの欠落 — 内容を発明しない)。

## 守る資産と認可設計

U2 が守る資産は **hold 強制の迂回不能性と承認の真正性**(FR-009 系の provenance、FR-003/FR-007 の hold)。CLI/library 構成のため独自の認証基盤・暗号化は導入せず、**既存 engine checkpoint の人間相関機構への相乗り**で認可を成立させる(cid:nfr-design:c1 — 常駐 service セレモニーの排除。ADR-6 改訂の境界どおり checkpoint 機構は無変更)。

| 資産 / 脅威 | 対策(`business-logic-model.md` の確定設計の NFR 面) |
|---|---|
| 承認の偽装(偽 receipt での terminal route 通過) | HumanApprovalRef は実 HUMAN_TURN の provenance(shard 一致 + timestamp + イベント本文 SHA-256)を receipt 生成時に照合(BR-U2-03)。偽装 fixture の落ちる実証を必須化(BR-U2-24) |
| hold の迂回(authoring 未完のまま下流前進) | 解除の唯一の経路は C9 の no-hold verdict(BR-U2-05)。checkpoint の解除規則・report 拒否は既存 engine の機械強制(実読確定済み — ADR-6 改訂注記) |
| stale evidence による解除 | 系列一致 × 内容不一致 = stale の 2 キー分離(BR-U2-15)。旧 verdict の存在は判定材料にならない |
| 壊れた evidence / 宣言の肯定的利用 | HoldFailure は hold と同様に前進を止める(BR-U2-16)。宣言 parse 失敗は hold 側へ倒す(BR-U2-18) |
| 宣言駆動結線の injection | evaluator / formalCheck の起動は argv 配列のみ、shell 展開なし(BR-U2-19) |
| 判定の恣意的操作(無関係モデルの成功流用) | 判定表 J1〜J6 は verdict を入力に持たない集合演算のみ(BR-U2-02) |

## 入力検証(システム境界)

- ChangeDeclaration は subjects 空・kind 矛盾(J2 の 4 形)を undecidable で拒否 — 宣言の鵜呑みをしない(`business-logic-model.md` §1)。
- hold/no-hold の判定正本は stdout の typed verdict JSON — exit code 単独で読まない(BR-U2-20)。
- 判別子・digest はブランド型スマートコンストラクタで形式検証(`domain-entities.md`)。

## 権限・攻撃面

- 新規のネットワーク経路・秘密情報はゼロ。読取は model-map / evidence store / audit shard(provenance 照合)、書込はゼロ(receipt 永続化は U1 経由 — BR-U2-04)。HumanApprovalRef の CLI 入力(--approval の json-path)の起源(人間操作で構成されるか・どの工程が生成するか)は code-generation で明示し、監査面の入力元を機械照合可能にする(§12a NIT の申し送り)。
- plugin.json 宣言面の追加は engine の advisory 供給読取に限られ、checkpoint の解除規則(人間相関・provenance 検証)は不変(ADR-6 改訂の境界 — BR-U2-08)。

## 上流トレーサビリティ

- `construction/applicability-hold/functional-design/business-logic-model.md`(判定表・hold 評価・宣言結線)、`business-rules.md`(BR-U2 群)、`domain-entities.md`(HumanApprovalRef / AdvisoryDeclaration)
- `inception/requirements-analysis/requirements.md`(FR-001、FR-003〜FR-005、FR-007、NFR-002、NFR-003)
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:52:32Z)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T23:00:56Z
- **Iteration:** 1
- **Scope decision:** none

security-design と logical-components は BR-U2/ADR-6/FD の確定契約を正確に引用し比例したセキュリティ設計・層構成を提示しておりブロッカーなし

### Findings

- NIT | logical-components.md:9-12 — 層構成表がCLI dispatch層をU1と同居のtla-authoring.tsに置く一方、純関数/handler層をtla-applicability.tsへ分離する境界根拠は§18に書かれているが、表内の各層行自体にも一言(同一module/別moduleの別)を添えると読者が表単体で境界を追える
- NIT | security-design.md:26 — 「書込はゼロ(receipt永続化はU1経由)」は正しいが、buildReceiptがaudit shardを読取る一方でHumanApprovalRef自体の起源(誰がapproval json-pathを渡すか)がsecurity-designに未記載。code-generationでCLI引数の入力元(人間操作 vs 自動生成)を明示すると監査性がさらに高まる
