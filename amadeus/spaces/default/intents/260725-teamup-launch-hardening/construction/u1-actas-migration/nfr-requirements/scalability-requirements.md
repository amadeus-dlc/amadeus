# Scalability Requirements — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 主フローと状態遷移（watcher の readiness）、最悪実行時間の内訳を引いた。
- `business-rules.md` — BR-1〜BR-22 のうち該当するものを各要件の根拠 ID とした。
- `requirements.md` — NFR-1〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 交差スタックと「新規ランタイム依存なし」の確認を、技術選択の前提とした。

測定 ref: HEAD `811961123`。

## 対象のスケール軸

本ユニットで意味のあるスケール軸は**チームのメンバー数**のみである。CLI であり、同時接続数・水平スケール・キャッシュといった常駐サービスの軸は該当しない（`cid:nfr-design:c1`）。

メンバー数は `-2` / `-4` / `-6` フラグで **3人 / 5人 / 7人**（leader + engineer×N）に限定される。無制限のスケールは存在しない。

## SC-1: 判定コストがメンバー数に比例しない

| 項目 | 内容 |
|---|---|
| 要求 | `watcher_verification_applies` の判定コストがメンバー数に依存しない |
| 実現 | 代表 role（`leader`）1件のみでプロンプトを導出する（ADR-2、BR-5 の不変条件が根拠） |
| 検証 | 実装が全 member をループしないこと |

## SC-2: 検証の待機がメンバー数に比例しない

| 項目 | 内容 |
|---|---|
| 要求 | 検証の待機時間が**メンバー数の和ではなく最大値**で決まる |
| 実現 | `verify_watchers_armed`（`:1174-1213`、本体不変）は全メンバーの sentinel を**共有ポーリング**する。1ラウンドで全員を見るため、待機は「最も遅いメンバー」で決まる |
| 検証 | 本体を変更しないこと。既存の共有ポーリング構造を保つ |

**これは既存の設計上の性質**であり、U1 で新たに作るものではない。ただし待機位置を変える際に壊さないことを要件として明示する。

## SC-3: プロンプト導出がメンバーごとに独立

| 項目 | 内容 |
|---|---|
| 要求 | `member_bootstrap_prompt` は member ごとに独立に導出でき、共有状態を持たない |
| 実現 | 純関数（BR-4）。`member_role` にのみ依存 |
| 検証 | 副作用がないこと、連続呼び出しで同一出力 |

## SC-4: actas 排他ロックのメンバー数耐性

| 項目 | 内容 |
|---|---|
| 要求 | **7人（最大構成）同時起動**でロック競合による起動失敗が起きない |
| リスク | actas は (team, role) 単位で排他ロックを取る。同一 role を複数セッションが取り合うことは設計上ないが、実測が未実施（RAID R-2） |
| 検証 | 7人構成での実 launch（BR-21、NFR-3） |

**メンバー数が増えるほど競合の機会が増える**ため、最大構成での実測が必要である。

## 非対象

| 項目 | 理由 |
|---|---|
| 8人以上のチーム | `-2` / `-4` / `-6` の3択に限定されており、それ以上の構成は存在しない |
| 複数チームの同時起動 | `--instance` で分離される既存機能。本ユニットは変更しない |
| 水平スケール・ロードバランシング・キャッシュ | 常駐サービスの軸であり CLI に該当しない（`cid:nfr-design:c1`） |
