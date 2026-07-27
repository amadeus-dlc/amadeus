# Intent Statement — docs-impl-sync

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない — 入力はユーザー記述と intent-capture-questions.md の回答)

## Problem Statement(解決する問題)

Amadeus リポジトリのドキュメント(`README*.md`、`docs/` 配下)は、実装(`packages/framework/core/`・`packages/framework/harness/<name>/`)の高速な進化に対して更新が追随しきれておらず、記述と実装の乖離が蓄積している疑いがある。乖離したドキュメントは読者を誤誘導し、正しくない手順・存在しない機構・古い契約を「現行仕様」として提示してしまう。過去の実測でも、docs の行番号引用・機構記述の陳腐化が繰り返し観測されている(例: 260725-teamup-launch-hardening での引用行シフト、docs 対象面の棚卸し漏れ)。

本 intent は、**実装コードと git 履歴を一次証拠として全ドキュメントを照合し、乖離を検出・修正し、欠落文書を補う**ことで、ドキュメントを「実測で裏付けられた状態」に戻す。

## Target Customer(誰が恩恵を受けるか)

全読者を均等に対象とする(Q5 = A,B,C,D):

- **利用者** — `README*.md`、`docs/guide/`(導入・スコープ・CLI の正確な案内)
- **ハーネスエンジニア** — `docs/harness-engineering/`(fork・ハーネス移植の正確な手順)
- **コントリビュータ・開発者** — `docs/reference/`(アーキテクチャ・状態機械・貢献手順の正確な記述)

## Success Metrics(成功指標)

Q3 = A(全件修正)に基づく完了条件:

1. **乖離ゼロ**: README*.md + docs/ 全域を現行実装(HEAD)と照合し、検出された乖離の全件が修正されている(Q6 = A: 全域 HEAD 照合が正。git log 差分は優先順位付けに使用)
2. **EN/JA 同期**: 修正・新規作成された文書の EN/JA 対訳が同一変更で同期されている(project.md ALWAYS 準拠)
3. **docs 系ゲート green**: t174 legacy-refs ゲートを含む既存 CI(typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci)が green
4. **欠落の充足**: 乖離監査で判明した文書欠落(実装済みだが docs 未記載の機能)が新規文書として補われている(Q4 = B)

## Initiative Trigger(なぜ今か)

- 実装の変更速度が高く(直近数週間で mirror productization、kimi harness、standing grants、swarm 拡張など大型着地が連続)、docs との乖離が拡大している蓋然性が高い
- 本 intent は新設スコープ `amadeus-document`(実装検証つきドキュメント作業)の初回実行でもあり、スコープ構成(RE→RA→FD→CG→B&T)の実効性を実測する機会となる

## Initial Scope Signal(スコープ指標)

- スコープ: `amadeus-document`(9/32 ステージ、Standard depth、Minimal test strategy)
- 対象: `README*.md`(ルート)+ `docs/` 全域。`amadeus/` 配下の workspace 文書・`.claude/` 配下の framework 内部文書は対象外(乖離が発見された場合は Issue 起票のみ)
- 作業種別: 既存文書の乖離修正+監査で判明した欠落の新規作成。実装コードの変更は行わない(docs で発見した実装バグは Issue 起票)
