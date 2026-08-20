# Logical Components — revise-model-commit(U1 / #2289)

上流入力: `construction/revise-model-commit/functional-design/business-logic-model.md`(route 依存 compose 手順)/ `security-design.md`(本ステージ同梱)。NFR Requirements 群(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は不在かつ設計どおり(security-design.md 冒頭と同じ宣言)。本書は registration 是正の**論理コンポーネント台帳** — デプロイ基盤を持たない intent のため、境界はコード面で表す。

## コンポーネント境界と blast radius

| 論理コンポーネント | 本 unit での扱い | blast radius / 隔離根拠 |
|---|---|---|
| leaf `authoring-routes.ts`(新規) | AUTHORING_ROUTES 定数の唯一の正本として新設(FD 手順1) | import ゼロの終端 — 循環は構造的に不可能。dormant 化しない(同一 PR で registration 側の消費まで配線 — FD domain-entities.md ライフサイクル) |
| `tla-registration.ts`(compose / commit) | 定義→import 置換 + route 必須引数 + `revise-target-missing` kind 追加(FD 手順2〜6) | 失敗は既存 Result 経路へ合流。CLI 面(`tla-authoring.ts` registrationCommit)は汎用 JSON 直列化のため**変更不要**(FD 手順4 の実測 — U1 write scope が tla-authoring.ts に触れない根拠) |
| `plugin.json`(U3 と共有) | tools[] へ1行追加のみ(FD 手順1 — 条件付き write scope の確定) | U3 の接触面は advisories[] — 行非交差。直列 PR 着地の textual merge で解決(unit 依存辺は追加しない) |
| `tla-applicability.ts`(:302 の定義) | **非接触**(FR-REG-5 後半は U4 の面) | U1 PR 時点で applicability 側の定義が残存していてよい(FD business-rules.md BR-1 の帰属条件) |
| t448(`tests/unit/t448-tla-registration.test.ts`) | 同名拒否 pin の author-new 再スコープ + zero-assertion 明示失敗化(FD 手順7) | source と test の ownership 一致(unit-of-work.md U1)。自己参照比較ブロック(:74-82)は非接触(FR-X-4 起票対象) |
| preconditions 6 検査・approvalVerifier・atomic replace・競合検知 | **非接触** | FD domain-entities.md「不変のエンティティ」— 書込の安全機構は既存のまま |
| model-map.json | **非接触**(スキーマ・エントリとも) | 置換意味論は compose の route 分岐であり、map スキーマの optional 性は不変(FD 手順6) |
| 生成台帳(`tests/.coverage-registry.json`) | 新規テスト分の regen 同梱 | 全 unit 共有の既知面 — registry-merge-recomposition の既定運用対象 |

## 障害ドメインと封じ込め検査

- **単一 PR 原子性**: leaf 新設 + 定義置換 + route 対応 + plugin.json 宣言 + テストを1 PR で着地(leaf だけの先行着地 = dormant module を作らない — FD domain-entities.md ライフサイクル、inception 先行着地禁止則)。
- **封じ込めの機械検査**: (a) 3面テスト(置換成功/置換対象不在/author-new 同名衝突 — FD 手順8 の TDD Red 先行)、(b) fail-open 再現の赤テスト固定 → loud 拒否で緑(FD「落ちる実証」)、(c) t3078(plugin.json 宣言漏れの機械検出)、(d) census 帰属条件(registration 側定義 0・leaf 定義 1、discriminator = `= new Set(` / `import {`)。いずれも FD の該当節を唯一の正本として参照(本書で再定義しない)。

## NFR パターン適用点(Infrastructure Design への橋渡し)

本 intent はデプロイ基盤・常駐サービスを持たず(`inception/application-design/services.md`「新設サービスなし」)、infrastructure-design ステージはスコープ外。本書の境界台帳が NFR 設計と code-generation の間の唯一の橋であり、追加のインフラコンポーネントは存在しない。
