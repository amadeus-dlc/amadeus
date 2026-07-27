# Domain Entities — U1 harness-capability-matrix

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> U1 の成果物(能力マトリクス文書)のデータ形状。unit-of-work.md U1 行と requirements.md FR-1 の 6 列契約を型として固定する。UI なし(services.md の常駐なし判定どおり CLI/文書のみ — frontend-components.md は非該当につき生成しない)。

## HarnessCapabilityRow(マトリクス 1 行)

| フィールド | 型 | 制約 |
|---|---|---|
| harness | `"claude" \| "codex" \| "cursor" \| "kimi" \| "kiro" \| "kiro-ide" \| "opencode"` | 7 値固定(requirements FR-1 の対象数の系譜) |
| distribution | 配布形式の実測記述+クラス割当 `"native-manifest" \| "folder-drop-auto" \| "manual-only"` | components.md C9 / ADR-4 の 3 クラス。各セルは実測(コマンド出力・実ファイル引用)か `⚠実装時実測` の明示(FR-1 合否) |
| trust | trust 境界と承認方法 | Amadeus trust grant との重ね方を明記 |
| composeTrigger | イベント語彙の実測(SessionStart 相当の有無・呼出保証) | 存在実測と語彙実測を区別(external-seam-vocab-measurement) |
| rootResolution | project root / plugin root / harness root の解決方法 | 実ファイル引用必須 |
| userOps | compose / doctor / drop の利用者操作(component-methods.md C1 verb 表への写像) | 全ハーネスで手動床 1 コマンドが成立すること |
| degradeContract | ホスト機構がない場合の明示 degrade 契約 | silent skip 禁止。doctor 可観測(unit-of-work-story-map ジャーニー1「確かめる」) |

## ProbeRecord(プローブ記録 1 件)

| フィールド | 型 | 制約 |
|---|---|---|
| target | harness × 面(distribution / trigger / root) | — |
| command | 実行コマンド verbatim | 本番経路の前処理を全数再現(probe-preprocessing-parity — FR-1 合否) |
| output | 出力の要点(verbatim 断片) | 数値・語彙はコマンド出力からの転記のみ |
| verdict | `"measured" \| "deferred(実装時実測)"` | ✅ 確約は measured のみに許す |

## 不変条件

- 行数 = 7(全数、欠落不可)。列 = 行キー `harness` + 6 コンテンツフィールド全数(FR-1 合否の「7 行 × 6 列+クラス割当」の 6 列は harness を除くコンテンツ列を指す)
- クラス割当は 3 値のいずれか必須 — 「未定」を残さない(残る場合は manual-only へ fail-closed で割当て、⚠ を付す)
