上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# U2 NFR Design 質問

**人間承認:** 2026-07-17T18:21:59Z — Q1・Q2 ともユーザーが `1` を選択。

## Q1: 補助 tier と不正 tier をどう識別しますか

上流は、`Tier` を将来の補助 tier へ開く一方、規約対象行の不正な `tier` は fail-closed としています。しかし現行コードは non-NamedTier を一律 `other` として除外するため、`harness` / `lib` のような正当な補助 tier と `unti` のような typo を区別できません。

A. **明示的な3分類（推奨）** — `NamedTier`、承認済み補助 tier、invalid の3つに分ける。まず補助 tier は実測済み `harness | lib` に閉じ、新しい補助 tier の追加は規約と registry を同時更新する。未知 tier は判定不能として fail-closed にする。
B. **すべての non-NamedTier を補助扱い** — 正規化済み文字列なら将来 tier も自動で対象外にする。拡張時の変更は不要だが、typo も無音で除外される。
X. **Other** — 別の識別規則を指定する。

[Answer]: A — 明示的な3分類。`NamedTier`、承認済み補助 tier（初期値 `harness | lib`）、invalid に分け、未知 tier は fail-closed とする。（ユーザー回答: `1`）

## Deferred: 実行時間予算

`TIME_BUDGET_{TIER}_SECONDS` は、既存 runner の個別 tier 実測後に推奨値を人間へ直接確認する上流規定どおり `PENDING` を維持する。未測定の数値を本質問で先取りしない。

## Q2: 設計生成前の確認

Q1 の決定を U2 NFR Design へ反映し、実行時間予算は測定後の人間承認まで `PENDING`、現行 purity ratchet gate と target policy の差は実装 gap として記録する。この内容で5成果物の生成へ進むか。

A. **確認して進む（推奨）**
B. **修正する**
X. **Other** — 追加・変更内容を指定する。

[Answer]: A — 確認して進む。（ユーザー回答: `1`）
