# Risk and Sequencing Rationale

**上流入力(consumes 全数)**: `requirements`(CON-1〜4・AS-1〜3 — リスクの源泉)/ `unit-of-work-dependency`(依存の実測)/ `bolt-plan`(編成)/ `components`(C-6→C-5 の PR 内順序制約)/ `unit-of-work` / `unit-of-work-story-map`(価値順)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 順序の根拠(risk-first — scope-definition Q1 裁定の継承)

1. **Bolt 1 = U1 単独先行**: 最大の技術リスク(hook emit 経路への差し込みが audit を壊さないか = NFR-3 の fail-open 実現性)を最小スライスで先に潰す。walking-skeleton ゲートで人間が実物(警告の発火と audit 行)を確認してから横に広げる。
2. **Bolt 内順序(C-6 → C-5)**: registry に無い属性を書くと検証で落ちるため、registry optional 追加を配線より先にコミットする(component-dependency の同一 PR 内順序制約)。これは作業の都合ではなくスキーマ検証の fail-closed を踏まないためのリスク制御。
3. **Bolt 2/3 の並行**: 依存グラフ上独立・編集面非交差の実測(unit-of-work-dependency)により、直列化の根拠がない。並行で回してリードタイムを短縮(resource-efficiency)。

## リスク台帳(RAID)

| # | リスク | 種別 | 対策 | 状態 |
|---|---|---|---|---|
| R-A | hook への差し込みが emit を壊す(監査停止 = S1 級) | 技術 | fail-open 設計(throw を catch し既存フィールドで emit 継続)+ Bolt 1 の落ちる実証と fail-open テスト + walking-skeleton ゲート | Bolt 1 で検証 |
| R-B | corpus sweep の期待件数(15種 / 330)が測定時刻でずれる | 検証 | AC-3 は「±」と測定時刻明記で吸収(audit は移動値 — RE の教訓)。sweep は Bolt 3 実装時に再計測 | 設計済み |
| R-C | Codex live(0.146.0)の model 供給が fixture(0.137.0)と異なる | 外部 seam | AS-1: fixture 契約でテストし、live 差異は欠落明示へ安全退化(fail-open)。live 実測は #2303/#2297 とは独立に将来検証可 | 受容(AS-1) |
| R-D | started 面のコードが Claude Code で検証不能(#2303/#2297 未修正) | 依存 | CON-2: completed 面を主経路とし、started 面は payload 形状テスト + kimi 経路で検証。**両 Issue の修正には依存しない**(external-dependency-map 参照) | 受容(CON-2) |
| R-E | builder subagent のレート上限 stall | 運用 | E-STG-S13F c3 の診断手順(failureReason 確認 → リセット待ち)+ 配送2経路監視 | 手順確立済み |
| R-F | 並行 Bolt 2/3 の worktree 事故(本線混入・stash 交差) | 運用 | `cid:code-generation:c2`(worktree ディスパッチ規律の定型文言)+ 非交差の事前目録照合 | 手順確立済み |

## 前 intent の成果を失うリスク

該当なし — 本 intent は既存挙動の置換を含まず、optional 属性と新設 CLI の追加のみ(`cid:delivery-planning:intra-bolt-order-as-risk-control` の検査を実施した結果、退行の窓を作る順序依存は R-A の registry 先行以外に存在しない)。
