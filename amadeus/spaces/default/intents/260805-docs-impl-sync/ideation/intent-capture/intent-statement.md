# Intent Statement — docs-impl-sync (260805)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない — 入力はユーザー記述、intent-capture-questions.md の回答、および参照入力としての前回 intent 260727-docs-impl-sync の成果物)

## Problem Statement(解決する問題)

Amadeus リポジトリのドキュメント(`README*.md`、`docs/` 配下)は、実装(`packages/framework/core/`・`packages/framework/harness/<name>/`)の高速な進化に対して更新が追随しきれず、記述と実装の乖離が再び蓄積している。前回の全域監査(intent 260727-docs-impl-sync、2026-07-27 完了)以降、source-only 移行(`dist/` とセルフインストールツリーの追跡境界変更)、plugin opt-in parity、スコープ語彙の `self-*` への整理、Issue taxonomy の再定義、telemetry/formal-verification 系の着地など、ユーザー可視契約に触れる変更が連続している。

乖離したドキュメントは読者を誤誘導し、存在しない手順・古い契約・失効した件数を「現行仕様」として提示する。本 intent は、**実装コードと git 履歴を一次証拠として全ドキュメントを現行 HEAD と照合し、乖離を検出・修正し、欠落文書を補う**ことで、ドキュメントを実測で裏付けられた状態に戻す。

## Target Customer(誰が恩恵を受けるか)

全読者を均等に対象とする(Q5 = D):

- **利用者** — `README*.md`、`docs/guide/`(導入・スコープ・CLI の正確な案内)
- **ハーネスエンジニア** — `docs/harness-engineering/`(fork・ハーネス移植の正確な手順)
- **コントリビュータ・開発者** — `docs/reference/`(アーキテクチャ・状態機械・貢献手順の正確な記述)

## Success Metrics(成功指標)

Q3 = A(全件修正)に基づく完了条件:

1. **乖離ゼロ**: `README*.md` + `docs/` 全域を現行実装(HEAD)と照合し、検出された乖離の全件が修正されている(Q2 = D: 全域 HEAD 照合が正。git log 差分は優先順位付けに使用)
2. **EN/JA 同期**: 修正・新規作成された文書の EN/JA 対訳が同一変更で同期されている(project.md ALWAYS 準拠)
3. **docs 系ゲート green**: docs 参照整合ガードを含む既存 CI(`bun run typecheck` / `bun run lint` / 隔離2回ビルドの再現性検査 / `bun run source-only:check` / グラフ不変量検査 / `bash tests/run-tests.sh --ci`)が green
4. **欠落の充足**: 乖離監査で判明した文書欠落(実装済みだが docs 未記載の機能)が新規文書として補われている(Q4 = B)

## Initiative Trigger(なぜ今か)

- 前回の docs 全域監査から実装が大きく前進しており、ユーザー可視契約(配布境界・スコープ語彙・plugin 導入・Issue 運用)に触れる着地が連続している
- 件数語・行番号引用・機構記述は世代交代で陳腐化する既知のクラスであり、周期的な再照合が必要(team.md の引用・列挙・件数系ノルム群が繰り返し実測している欠陥様式)
- 本 intent は `self-document` スコープの再実行でもあり、前回確立した監査手順(RE→RA→FD→CG→B&T)の再現性を実測する機会となる

## Initial Scope Signal(スコープ指標)

- スコープ: `self-document`(9/32 ステージ、Standard depth、Minimal test strategy)
- 対象: `README*.md`(ルート)+ `docs/` 全域。`amadeus/` 配下の workspace 文書・`.claude/` 配下の framework 内部文書は対象外(乖離が発見された場合は Issue 起票のみ)
- 作業種別: 既存文書の乖離修正 + 監査で判明した欠落の新規作成。実装コードの変更は行わない(docs で発見した実装バグは Issue 起票)
- 参照入力: 前回 intent `260727-docs-impl-sync` の成果物(requirements / functional-design / code-summary)。record はコピーせず git 上の正本を参照する(Q7 = A)
