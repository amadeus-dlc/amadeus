# Domain Entities — U6 activation-policy

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> ADR-1 案 A(裁定済み 2026-07-27)の実装型。UI なし(services.md — frontend-components.md 非該当につき不生成)。unit-of-work.md U6 行の「spec-hash 計算・状態永続化・engine advisory・--single 撤廃」を型で固定する。

## ActivationWatch(plugin 宣言 — 監視対象)

| フィールド | 型 | 制約 |
|---|---|---|
| globs | readonly string[] | plugin 側宣言(既定 `["specs/tla/**"]`)。compose の path escape 拒否対象(requirements NFR-1) |

## SpecHashState(永続化 — composition record 隣接・gitignore)

| フィールド | 型 | 制約 |
|---|---|---|
| schema | 1 | — |
| lastVerdictHash | string(sha256 hex) | 最終 verdict 記録時の computeSpecHash 出力。初期値なし(ファイル不在 = 未実行) |
| recordedAt | ISO 8601 | verdict 記録時刻 |

## ActivationJudgment(判別 union — 決定的判定の出力)

```
type ActivationJudgment =
  | { kind: "changed"; currentHash: string; lastHash: string }   // advisory 発火(stderr 1 行+doctor 行)
  | { kind: "current"; hash: string }                            // 非発動(doctor 行は match 表示)
  | { kind: "never-run"; currentHash: string }                   // 初回(advisory 発火 — 未実行も「変更あり」扱い)
```

同一入力(ファイル集合・内容)→ 同一判定(requirements FR-7(c) の決定性)。

## AdvisoryLine(engine 側 — stderr のみ)

- 形式: `advisory: formal-model-check spec hash CHANGED (specs/tla) — run /amadeus --stage formal-model-check` の 1 行
- 排他制約: stdout の directive JSON を汚さない(cid:code-generation:stdout-directive-stderr-advisory — component-methods.md C6 の契約)

## 不変条件

- computeSpecHash は glob 展開のソート済みファイル列(パス+内容)の sha256 — ファイル順序・OS 差で揺れない
- `--single` 撤廃後も、formal-model-check の実行自体は明示起動のみ(自動実行なし — ADR-1 案 A の却下案 D との境界)
- SpecHashState 書込は verdict 記録時のみ(advisory 発火では書き換えない — 発火の冪等性)
