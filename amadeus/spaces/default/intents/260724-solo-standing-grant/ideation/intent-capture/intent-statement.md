# Intent Statement — ソロ向けスタンディング承認グラント

上流入力（consumes 全数）: なし。一次入力は [GitHub Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466) とユーザーの直接回答。

## Problem Statement

Amadeus のソロモードでは、初期化を除く各ステージの承認に新しい `HUMAN_TURN` が必要である。監査可能な人間関与は必要だが、長いワークフローが通常ステージごとに停止するため、利用者が望む「Phase 境界でまとめて確認する」粒度より細かい。

既存のスタンディング委任グラントは通常ステージを期限付きで承認できるが、チームモード専用であり、ソロモードでは発行も利用も拒否される。単純にモード制約を外すと、Space 内の別 Intent へ承認が波及する可能性と、コンダクターが従来どおり全ゲートを提示する不整合が残る。

## Target Customer

主対象は Amadeus をソロモードで利用し、監査と重要境界の人間確認を維持しながら、通常ステージを連続実行したい開発者である。特にステージ数の多い `amadeus-*` スコープを使う Amadeus 自己開発で、停止回数をPhase単位へ集約したい利用者が直接便益を受ける。

副次的な関係者は、既存チームモードの後方互換性を守る Amadeus 保守者と、`Grant Id` を含む承認証跡を確認する監査・レビュー担当者である。

## Success Metrics

1. ソロモードで、実 `HUMAN_TURN` に接地した期限付きグラントを発行・撤回できる。
2. グラントは発行時の Intent に限定され、別 Intent のゲートを承認しない。
3. 対象となる通常ステージは、追加の人間返信なしに承認まで完了する。
4. Phase 境界、実効的に有効な Walking Skeleton、Request Changes、失敗・halt-and-ask は人間確認を維持する。
5. 自動承認でも成果物ガード、reviewer、learnings、通常の監査イベントが実行され、`GATE_APPROVED` から `Grant Id` を追跡できる。
6. 現在および将来の `amadeus-*` スコープへ、スコープ名の固定 allowlist なしで一貫して適用される。
7. チームモードの既存スタンディング委任グラントに退行がない。
8. 通常ゲート、Phase 境界、Walking Skeleton、Intent 隔離、期限切れ、撤回、provenance 不正を自動テストで実証する。

## Initiative Trigger

ユーザーから「細かすぎる場合は Phase ゲートだけ人間に確認したい」と要望があり、既存機構を調査した結果、チームモードのスタンディング委任グラントが近い意味論を既に持つ一方、ソロモードでは利用不能であることが判明した。この差を解消するため [Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466) を起票し、ユーザーが実装開始を選択した。

## Initial Scope Signal

変更種別は Amadeus の新機能なので、開発ワークフローは `amadeus-feature` とする。製品機能の適用範囲は `amadeus-feature` 限定ではなく、`amadeus-bugfix`、`amadeus-refactor` を含む `amadeus-*` スコープ全般である。適用判定は個別スコープ名ではなく、Intent、コンパイル済みステージグラフ、Phase 境界、Walking Skeleton stance に基づく。

対象外は、HUMAN_TURN 監査の削除、無期限・Space全体の暗黙グラント、PRマージなど不可逆な外部操作の自動承認、失敗経路の自動継続である。
