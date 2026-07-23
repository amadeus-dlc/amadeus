# Stakeholder Map — 260723-archived-status-guard

## ステークホルダーと関心

| ステークホルダー | 関心 | 関与点 |
|---|---|---|
| ユーザー(裁定者) | 閉じた intent が無断再開されないこと。override は自分の承認でのみ | archive/unarchive の承認、ゲート裁定 |
| leader / conductor(エージェント運用) | intent 選択一覧・cursor 操作で archived を誤選択しない(loud 拒否で気づける) | エンジン verb の消費者 |
| エンジン保守者(この repo の開発) | status enum が updateIntentStatus / listIntents / cursor / next / unpark の全経路で一貫すること(symmetric-pair) | 実装・テスト |
| #1309 契約(e2 intent) | status 語彙が ライフサイクルレコード共通契約と分裂しないこと | 語彙 enum の共有(実装は本 intent、契約参照は e2 成果物) |
| 260713 record(移行対象) | closure-note.md の裁定根拠が archived 移行に正しく引用されること | 移行の provenance |

## 利害の衝突点

- 機構ガードの厳格さ vs 運用の柔軟性: override を重くしすぎると正当な再開(ユーザーが翻意した場合)が煩雑になる — override verb の形態は questions Q1 で裁定
- enum の網羅性 vs 現行挙動の温存: parked を registry で追跡し始めると park/unpark の書込面が増える — Q2 で裁定
