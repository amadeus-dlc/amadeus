# External Dependency Map — チーム機能のコア昇格

> 上流入力(consumes 全数): requirements(FR-3/FR-8 の PATH 契約)、components(C4/C6 の依存実装面)、unit-of-work(U3/U4 の依存面)、unit-of-work-dependency(依存が関与する Bolt 合流の根拠)、unit-of-work-story-map(利用者到達経路上の依存出現順)、team-practices(CI・リリース面の既定 — 新規ワークフローなしの根拠)

## 外部依存(すべて PATH 前提の必須 prerequisite — 同梱・抽象化なし)

| 依存 | 種別 | 関与 Bolt | 契約 |
|---|---|---|---|
| bun | 実行ランタイム | 全 Bolt | 既存 prerequisite(変更なし) |
| herdr(実測 0.7.1) | terminal multiplexer | Bolt 2(検査実装)/ Bolt 3(fake seam 検証) | PATH 実行可能性のみ。不在 = exit 1+案内(FR-3c)。CI は fake-binary で代替(ADR-4) |
| agmsg(実測 1.1.6) | メッセージング | Bolt 2 / Bolt 3 | 同上。公式入手経路を docs 参照(RA Q5) |
| Ghostty / mise | ターミナル起動 / env 管理 | Bolt 2(搬送のみ) | team-up.sh 内の既存参照を不変搬送(NFR-2)。prerequisite 検査対象は herdr/agmsg のみ(FR-3c の宣言どおり) |
| GitHub Actions(既存 CI) | 検証基盤 | 全 Bolt | 既存ジョブのみ(新規ワークフローなし — NFR-1/ci-pipeline:c2) |

## 外部サービス操作

なし(npm publish 等のリリース面は本 intent 対象外 — NFR-4)。
