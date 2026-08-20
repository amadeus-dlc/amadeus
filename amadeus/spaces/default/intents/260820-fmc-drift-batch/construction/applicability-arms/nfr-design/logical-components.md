# Logical Components — applicability-arms(U4 / #3186)

上流入力: `construction/applicability-arms/functional-design/business-logic-model.md`(段挿入手順)/ `security-design.md`(本ステージ同梱)。NFR Requirements 群(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は不在かつ設計どおり(security-design.md 冒頭と同じ宣言)。本書は判定 pipeline 拡張の**論理コンポーネント台帳** — デプロイ基盤を持たない intent のため、境界はコード・文書面で表す。

## コンポーネント境界と blast radius

| 論理コンポーネント | 本 unit での扱い | blast radius / 隔離根拠 |
|---|---|---|
| 判定 pipeline(`tla-applicability.ts` judge 後・receipt 前) | armCheck + coverageCheck 段の挿入(business-logic-model.md 手順1) | J1..J6 表・route 語彙・交差契約(#3261)・receipt 契約(#3262)は非接触(FR-ARM-7 — 追加は発火述語のみ) |
| CLI 入力シーム(`--issue-evidence` / `--changed`) | `tla-authoring.ts` applicability verb へ追加(手順3・4・8) | conductor 供給のローカルファイル/パス集合のみ。新 verb なし・新 CLI なし(ADR-3)。plugin→core import 新設なし |
| `AUTHORING_ROUTES`(`tla-applicability.ts:302`) | 定義削除 → leaf import(手順6 — FR-REG-5 後半) | leaf は U1 が新設(ADR-1 帰結の消費 — 実装時に実在確認、不在なら停止)。完成形 census: 定義 leaf 1・両ファイル 0 |
| stage 契約(`stages/tla-authoring.md` :51 近傍) | 発火述語 + two-layer 整合の明文追加(手順7) | U3 が :53 を撤去した後の断面へ追記 — U3→U4 直列(承認済み唯一の依存辺)で衝突回避 |
| docs(`docs/reference/22-formal-model-supply.{md,ja.md}`) | 腕の契約追記(en/ja 同一変更、手順7) | U3 撤去後断面への追記 — 同上の直列化 |
| engine(`amadeus-orchestrate.ts` 汎用 advisory 機構)・`tla-registration.ts`・leaf 内容・model-map スキーマ | **非接触** | business-logic-model.md「不変のエンティティ」相当の宣言(domain-entities.md)— 読取のみ |
| テスト面(述語レベル実 corpus・pipeline fixture・両側テスト) | 新設(手順の「落ちる実証」二層設計) | 他 unit の着地順に非依存(述語レベルは実ファイル直接入力、pipeline レベルは合成 fixture)— 承認済み unit graph に辺を追加しない |
| 生成台帳(`tests/.coverage-registry.json`) | 新規テスト分の regen 同梱(手順9) | 全 unit 共有の既知面 — registry-merge-recomposition の既定運用対象。coverage-patch-allowlist は別クラス(UNCOVERED 時のみ createSemanticSelector 再アンカー — 手順9 の書き分け) |

## 障害ドメインと封じ込め検査

- **単一 PR 原子性**: 段挿入 + import 置換 + stage/docs 追記 + テストを1 PR で着地(domain-entities.md ライフサイクル)。
- **封じ込めの機械検査**: (a) 述語レベルの実 corpus 赤(PrConvergenceGate/BoltPrAttestationGate の landed 欠落 — U1/U2 非依存)、(b) pipeline fixture の発火・非発火両側、(c) defectRecurrence の閾値両側固定(観測最小 0 < 1 < 観測最大 2)、(d) fail-closed fixture(parse 不能 → 明示 halt)。いずれも business-logic-model.md「落ちる実証」節を唯一の正本として参照(本書で再定義しない)。
- **文書面の drift 検査**: stage 契約・docs のリテラル変更は prose リテラル pin テスト census(bt-prose-literal-test-ledger クラス)を経て着地(business-logic-model.md「生成台帳・CI 整合」)。

## NFR パターン適用点(Infrastructure Design への橋渡し)

本 intent はデプロイ基盤・常駐サービスを持たず(`inception/application-design/services.md`「新設サービスなし」)、infrastructure-design ステージはスコープ外。本書の境界台帳が NFR 設計と code-generation の間の唯一の橋であり、追加のインフラコンポーネントは存在しない。
