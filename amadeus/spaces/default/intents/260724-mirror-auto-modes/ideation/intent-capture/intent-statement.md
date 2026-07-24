# Intent Statement — mirror-auto-modes

> 先行成果物: 完了済み Intent `260719-mirror-productization`。既存の Issue ミラー、3層設定、phase 境界同期を土台として変更する。

## Problem Statement

現在の `auto-mirror` は boolean であり、`true` にしても自動化されるのは既存 Issue の sync だけで、create と close には確認が残る。この挙動は「auto-mirror」という名称から期待されるライフサイクル全体の自動化と一致せず、利用者が設定の意味を予測しにくい。また、Intent を早期に GitHub Issue へ共有し、他の開発者との作業競合を避けるには、作成から完了まで一貫したポリシーが必要である。

## Target Customer

- Amadeus を利用して複数の開発者・エージェントの Intent を GitHub Issue 上で共有するチーム
- create・sync・close の確認頻度と外部書き込みリスクを、明示的な1つの設定で制御したい workflow 利用者
- Issue ミラーの不調があっても開発 Workflow 自体は継続したい利用者
- 設定・engine・配布物・日英ドキュメントの整合性を維持する Amadeus 保守者

## Success Metrics

1. `auto-mirror` が `off | prompt | auto` の3値だけを受理し、旧 boolean は明示的な設定エラーになる。
2. 未指定時は `prompt` として動作し、create・sync・close の各外部操作前に確認する。
3. `off` では create・sync・close のいずれも発火しない。
4. `auto` では Intent Capture 承認直後に Issue を作成し、各 phase 完了時・park 時・workflow 完了時に同期する。
5. `auto` では、Amadeus が当該 Intent 用に作成した Issue だけを、最終同期成功後に close する。
6. GitHub 操作が失敗しても Workflow は継続し、未同期状態と警告を記録して次の境界で再試行する。
7. core 正本、各ハーネス配布物、設定検証、engine の回帰テストが3モードの全分岐を検証し、drift guard が通る。
8. ユーザーガイドと開発者リファレンスの日英両方が、3モード、既定値、移行非互換、実行境界、失敗時の挙動を説明する。

## Initiative Trigger

先行 Intent で Issue ミラーをフレームワーク機能として製品化した結果、boolean の `auto-mirror` が sync だけを自動化するという意味上の不一致が明確になった。機能が広く利用される前に設定契約を3モードへ正規化し、ライフサイクル全体の挙動と名称を一致させる。

## Initial Scope Signal

変更種別は既存機能の契約とライフサイクル動作を拡張する **`amadeus-feature`** とする。

### 対象

- 3層設定の `auto-mirror` スキーマ、解決結果、検証エラー
- engine の create・sync・close 指令と再試行可能な未同期状態
- Issue が Amadeus 作成であることを判定する provenance
- core 正本、全ハーネスへの投影、テスト、drift guard
- 関連するユーザーガイドと開発者リファレンスの日英版

### 対象外

- 旧 boolean 設定の互換読み替え・移行期間
- GitHub 以外の Issue tracker
- 各 stage 完了ごとの自動同期
- 外部で作成され、この Intent に後付けでリンクされた Issue の自動 close
