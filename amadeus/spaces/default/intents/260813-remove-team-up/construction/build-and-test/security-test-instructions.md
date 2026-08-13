# Security Test Instructions — 260813-remove-team-up

上流入力(consumes 全数): `construction/remove-team-up/code-generation/code-generation-plan.md`(削除と文書置換。新規認証面なし)、`construction/remove-team-up/code-generation/code-summary.md`(変更面は正本削除・doctor 文言・docs・回帰)。

## 適用外判定(専用セキュリティ試験)

**判定: SAST/DAST・認証認可試験・インジェクション試験は適用外(新規に作らない)。**

requirements.md にセキュリティ属性の数値目標も、認証・外部入力処理の NFR も無い。stage 契約 Step 4-8 も `security-test-instructions.md` を **IF NFR security requirements exist** の条件付きとしている。変更は未使用ランチャの除去であり、ネットワーク境界やユーザー入力パーサを新設していない。

## 既存の担保面(セキュリティ隣接)

| 契約 | 担保する面 | 種別 |
|---|---|---|
| 死んだランチャを再実行させない(FR-4) | `t-remove-team-up-absence` と `t226` が `tools/team-up.sh` 案内を拒否 | 既存(本 Intent) |
| 生成面を手で直さない(FR-6) | `bun run build` のみ。source-only 規律 | 既存リポジトリ |
| 制御バイト混入 | CI `control-byte-gate` | 既存(横断) |

bash 3.2 `set -u` クラッシュ(#2970)はランチャ削除で再現経路が消える(FR-8)。クラッシュガードは実装しない。

## この判定を覆す条件

1. Team Mode 相当のセッション起動面を再導入する。
2. requirements が脅威モデルまたはセキュリティ NFR を明示する。
