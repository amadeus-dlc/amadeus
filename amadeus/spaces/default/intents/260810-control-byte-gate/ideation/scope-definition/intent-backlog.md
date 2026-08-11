# Intent Backlog — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): intent-statement.md(完了条件 (1)〜(4) と確定済み裁定を proto-Unit の受け入れ条件へ転記)

## Proto-Units(MoSCoW)

すべて単一 intent 内の proto-Unit。優先度は依存順(Q1 裁定: 線形連鎖)。

| # | Proto-Unit | MoSCoW | 依存 | 概要 |
|---|---|---|---|---|
| B1 | walking-skeleton: 検出ゲート本体 + CI blocking 配線 + 落ちる実証 | Must | — | `isUtf8` 由来の述語で対象集合を全数走査、PDF allowlist、ファイル・オフセット名指しメッセージ、ci.yml blocking 追加、注入→赤→復元→残渣ゼロの1セット |
| B2 | docs-only PR 起動条件(detect-ci-changes 分岐)+ 残余精緻化 | Must(docs/ を対象に含める場合) | B1 | `scripts/detect-ci-changes.sh` の分岐追加、対象集合の最終形反映、sweep 再実測 |

備考: B2 の要否と統合可否(B1 へ吸収して単一 Bolt 化)は units-generation で確定する。`tests/` fixture 自己衝突の解消方式は要件・設計段の裁定に従い、B1 の落ちる実証の実装形へ反映する。

## Won't(明示除外 — scope-document のアウト境界と同一)

- ノルム追記のみ / .gitattributes 委譲 / 点在防御の改修 / リリース成果物側検査 / t55 skip 穴の改修

## 価値ストリーム

混入発生(任意経路)→ PR 作成 → CI blocking ゲートが該当ファイル・オフセットを名指して赤 → 混入者が即時修正 → 検証規律(grep 全数列挙・不在主張)の信頼性が保存される。
