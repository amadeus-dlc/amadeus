# Scalability Design — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`

- `scalability-requirements.md` — SC-1（判定コストがメンバー数に比例しない）、SC-2（待機が最大値で決まる）、SC-3（プロンプト導出の独立性）、SC-4（7人でのロック競合）を、下記の実装方針で満たす対象とした。
- `business-logic-model.md` — 判断1（プロンプト導出）と判断2（適用可否）を引き、コスト特性の根拠とした。
- `performance-requirements.md` — P-4（判定コスト）を引き、SC-1 と同じ実装で満たされることを確認した。
- `reliability-requirements.md` — R-5（冪等性）を引き、SC-3 の純関数設計と整合させた。
- `security-requirements.md` — S-3（actas ロック）を引き、SC-4 の検証項目とした。
- `tech-stack-decisions.md` — bash のみで実装する方針を引き、並列化等の機構を導入しないことを確認した。

測定 ref: HEAD `138a60372`。

## 設計方針

メンバー数は 3 / 5 / 7 の3値に限定される。**スケールのための機構を新設しない。** 既存構造がすでに満たしている性質を壊さないことが設計の中心になる。

## D-SC1: 判定を代表 role 1件で行う

```
watcher_verification_applies():
  member_bootstrap_prompt(leader) を1回導出して " actas " の有無を見る
```

全 member をループしない。判定コストはメンバー数に依存しない（SC-1 / P-4）。

**根拠**: ADR-2 の不変条件 — `member_bootstrap_prompt` は role をフォーマットに埋めるだけで、`" actas "` の有無は role に依存しない。この不変条件をテストで固定する（`business-rules.md` BR-5）。

## D-SC2: 共有ポーリングを維持する

`verify_watchers_armed`（`:1174-1213`）は全メンバーの sentinel を1ラウンドでまとめて見る。待機は「最も遅いメンバー」で決まり、メンバー数の和にはならない（SC-2）。

**本体を変更しない**ことで維持する。変えるのは呼び出し位置と、再送・診断のプロンプト導出だけ。

**アンチパターン**: メンバーごとに順次待つ実装にすると、7人で最悪 `60 × 7 × 2` = 840秒 になる。共有ポーリングなら `60 × 2` = 120秒。

## D-SC3: プロンプト導出を純関数にする

`member_bootstrap_prompt` は副作用を持たず、`member_role` にのみ依存する（SC-3 / R-5）。

| 性質 | 効果 |
|---|---|
| 純関数 | メンバーごとに独立に導出でき、共有状態を持たない |
| 冪等 | 同一入力で同一出力。連続呼び出しで一致 |
| 状態を持たない | 事前構築した表を保持しないため、member 集合の変化（`-2`/`-4`/`-6`）に自動追従する（ADR-1） |

## D-SC4: 7人構成での actas ロック競合

| 項目 | 内容 |
|---|---|
| 要求 | 最大構成（7人）でロック競合による起動失敗が起きない（SC-4） |
| 設計上の期待 | actas は (team, role) 単位でロックを取る。7人は7つの異なる role であり、同一ロールを取り合う構造ではない |
| リスク | 前回セッションの stale ロックが残っている場合 |
| 検証 | **7人構成での実 launch と、resume（`-c`）での実測** |

**メンバー数が増えるほど競合の機会が増える**ため、最大構成での実測が必要である。3人構成での成功は7人での成功を保証しない。

## 対象外

| 項目 | 理由 |
|---|---|
| 8人以上のチーム | `-2` / `-4` / `-6` の3択に限定されている |
| 複数チームの同時起動 | `--instance` で分離される既存機能。本ユニットは変更しない |
| 並列化・水平スケール・キャッシュ | 常駐サービスの機構であり CLI に該当しない（`cid:nfr-design:c1`）。worktree の並列化は U2 の対象 |
