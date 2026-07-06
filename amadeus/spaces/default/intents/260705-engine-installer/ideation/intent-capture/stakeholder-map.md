# Stakeholder Map — Engine Installer（260705-engine-installer）

## 主要ステークホルダーと関心事

| ステークホルダー | 役割 | 関心事 |
|---|---|---|
| Amadeus 導入者（Claude ハーネス） | 主要利用者 | 1 コマンドで導入でき、symlink・settings.json 配線が壊れないこと。再実行しても自分の設定と `aidlc/` 記録が壊れないこと |
| Amadeus 導入者（Codex ハーネス） | 主要利用者 | `.agents/` 配置のみで追加配線なしに動作すること |
| Maintainer（j5ik2o） | ゲート審査官、grilling での設計確定者 | 確定判断 6 件どおりの実装。`aidlc/` 不可侵の遵守。PR の merge 判断 |
| Amadeus エンジン・validator | 配布対象の契約所有者 | インストーラがエンジンレイアウトを読むだけで書き換えないこと。doctor / validator がインストール後検証で機能すること |
| 並行 Intent（#428 上流同期、bug 束ね Intent） | 接触面 | エンジンレイアウト変更時のインストーラの追従。`package.json` scripts と eval の追記型接触の union 解消 |
| #441（OTel 計装基盤） | 後続依存 | 本 Intent の専用 eval が #441 受け入れ条件の検証土台になること |

## 意思決定者と影響者

- **意思決定者**: Maintainer。設計論点 6 件は grilling で確定済み。残る実装判断 3 件（スクリプト置き場所と命名 / AMADEUS.md 再構成の程度 / settings.json マージ詳細）は担当 engineer（engineer2）の構造判断または軽いピア協議に委任済み。gate 承認と merge は Maintainer が行う（leader 経由の中継承認）。
- **影響者**: 並行 Intent 2 件（エンジンレイアウトの変更元）と、dev-scripts ルール（TDD、Bun/TS 前提）。

このプロジェクトは 1 人の人間と複数エージェントの自己開発体制であり、外部の承認者は存在しない。

## コミュニケーション要件

- 進捗と判断は、本 Intent record（`aidlc/spaces/default/intents/260705-engine-installer/`）と Issue #451 で追跡する。
- gate 到達・PR 作成・ブロック・Intent 完了の 4 イベントを leader へ報告する。ピア協議は leader + engineer1, 3 宛（期限 15 分・回答 1 件で成立）。
- PR 説明から Issue #451 と本 Intent をリンクし、並行 Intent との接触面を明記する。
