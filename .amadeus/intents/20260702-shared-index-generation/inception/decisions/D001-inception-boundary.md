# D001: Inception の所有境界

## 背景

Issue #334 は、共有インデックス `intents.md` と `discoveries.md` の生成物化を扱う。
既存の validator、同梱スクリプト、writer skill、steering テンプレート、workspace と examples の実データに載せる変更である。

## 判断

この Intent を brownfield として扱い、所有境界を次に固定する。

- 所有する: 再生成スクリプトと検証、モジュールファイルの見出し契約、生成マーカー、validator の不整合検査、writer skill の手順、steering テンプレートの index 雛形、workspace と examples の migration。
- 所有しない: `glossary.md`、`domain-map.md`、`context-map.md` の生成物化、repo 開発用 `CONTEXT.md`、並行実行の他候補（ゲート待ちキューの可視化、並行運用ポリシー、Bolt の依存 wave 並行実行）。

## 理由

Ideation の scope（SC-IN-001 から SC-IN-004、SC-OUT-001 から SC-OUT-004）と grilling の確定判断（GD001 から GD003）が境界を確定しており、codebase-analysis で既存の統合点と migration 範囲を確認済みであるため。

## 影響

対象外の共有成果物の生成物化は、この Intent の学習候補として残し、必要になった時点で後続 Intent として扱う。
