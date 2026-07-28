# Security Requirements — U2 u2-install-verb

上流入力(consumes 全数): business-logic-model.md(Step 3 α〜δ)、business-rules.md(BR-U2-3/BR-U2-4)、requirements.md(FR-1b/1c)、technology-stack.md(実行環境)

## SR-U2-1: trust 境界不変(最重要)

install は信頼判定前の素材配置のみ(business-rules.md BR-U2-3)。compose の三層検証・承認ゲートをバイパス・複製しない(requirements.md FR-1b)。staging(`.amadeus-plugin-src/`)の外へ書かない(business-logic-model.md の書込面 = staging+dot-tmp のみ)。

## SR-U2-2: symlink 防御

source 内 symlink はコピーせずスキップ+stderr 警告(business-rules.md BR-U2-4)— dangling/外部参照 symlink を staging へ持ち込まない。コピーは実体ファイルのみ(technology-stack.md の Bun/TypeScript ランタイム前提からの敷衍 — lstat 判定は本書の設計判断であり同書の逐語記述ではない)。

## SR-U2-3: 無音上書きの禁止

different 時の loud 失敗+`--force` 限定置換(requirements.md FR-1c = Q2 ユーザー裁定)。置換も swap 内(business-logic-model.md β〜δ)で行い、裸削除の窓を作らない。
