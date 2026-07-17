# Stakeholder Map — standing-delegation-grant

上流入力(consumes 全数): なし(本ステージは consumes 宣言なし — 一次入力は intent-statement.md と同じ Issue #1125・クロスレビュー所見・ユーザー方向性確認)

## ステークホルダー一覧

| ステークホルダー | 関心 | 関与点 |
|---|---|---|
| ユーザー(人間オーナー) | 統制を保ったまま停滞を解消。グラントの発行・撤回の主体 | グラント発行(実 HUMAN_TURN)、TTL/除外の裁量、PR マージ承認(不変) |
| leader セッション | delegate 発行の実務。待ち行列・再発行の運用負荷が解消対象 | grant verb の実行面、doctor 可視化の消費者 |
| conductor(各メンバー) | gate open→delegate 待ちの park/unpark 往復が解消対象 | approve 側の第2経路の消費者 |
| engine(amadeus-state.ts) | provenance 検証の fail-closed 性を保ったまま第2経路を受理 | 実装対象(grant/revoke verb・検証分岐・audit) |
| 監査・レビュー | グラント根拠の approve が事後追跡可能であること | GRANT_ISSUED/REVOKED・approve 行の provenance 記載 |

## 意思決定権の所在

- グラントの発行・撤回・TTL 裁量: ユーザー(P4 — 不可逆・外部境界の人間統制)
- 除外集合の変更: ユーザーエスカレーション事項(standing-approval-scope-limit の行為種別限定)
- 実装の設計判断: エージェント選挙(P1)— Q4(session 終了失効の選択制)は requirements/design 段へ送付済み
