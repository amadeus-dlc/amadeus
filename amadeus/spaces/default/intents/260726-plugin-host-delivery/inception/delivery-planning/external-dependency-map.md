# External Dependency Map — plugin-host-delivery

> 上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map、team-practices

## 外部依存の全数(feasibility D-1〜D-4 の Bolt への写像)

| 依存 | 消費 Bolt | 状態 | リスク時の扱い |
|---|---|---|---|
| 上流 awslabs/aidlc-workflows commit `29a31f78`(doc / test-pro / t188) | Bolt 1(方式参照)、Bolt 7(追跡表正準) | 取得済み(2026-07-26 直読)— pin 固定、後続上流変更は追わない(requirements A-4) | 変化なし(pin) |
| 各ハーネスのホスト側プラグイン/フック機構(7 面) | Bolt 1(実測)、Bolt 3/6(実装) | **未実測** — Bolt 1 が確定条件 | 非対応面は degrade 契約+doctor 可観測(silent skip 禁止) |
| 既存 compose engine(scripts/plugin-composition.ts)+t252-254 | Bolt 2(移設) | 実在確認済み(codekb) | 移設で既存テスト red なら即修正(Bolt 内先頭手順) |
| 既存 CI(GitHub Actions)・drift ガード(dist:check / promote:self:check) | 全 Bolt | 稼働中 | 新投影面の regen を最終 rebase 時必須(R-5 手当) |
| Bun ランタイム(1.3 系) | 全 Bolt | 稼働中 | runtime dependency 追加禁止(NFR-3)— 依存増なし |
| gh / GitHub(PR・ミラー) | 全 Bolt(PR 運用) | 稼働中。ミラー同期は #1548 修正待ちで pending | ミラーは fail-loud 継続(workflow 非停止) |

## 依存しないもの(明示)

外部 SaaS の新規契約・新規 npm 依存・marketplace への公開登録(本 intent は成果物生成まで — 公開レジストリ登録は release 運用の範囲でスコープ外)。
