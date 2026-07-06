# Domain Entities — docs-consistency

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更対象の実体と変更種別

| 実体 | path | 変更種別 | 対応 FR |
|---|---|---|---|
| rollout-plan | `docs/amadeus/skill-englishization-rollout-plan{.md,.ja.md}` | 削除（stub なし） | FR-1.2 |
| 参照元 1 | `docs/amadeus/skill-language-policy{.md,.ja.md}`（109 行） | Related documents のリンク行を「到達点 + 退役注記」段落へ置換（FR-1.3 の判断を兼ねる） | FR-1.2 / FR-1.3 |
| 参照元 2 | `docs/amadeus/aidlc-v2-reviewer-mapping{.md,.ja.md}`（81 行） | リンク行を除去（退役注記は language-policy 側 1 箇所に集約し重複させない） | FR-1.2 |
| overview | `docs/amadeus/lifecycle/overview{.md,.ja.md}`（86 行の定義、270 行の差分表行） | scope-grid + steering の 2 層構造へ記述更新（見出し不変） | FR-2.1 |
| scopes | `docs/amadeus/lifecycle/scopes{.md,.ja.md}`（41 / 104 行相当） | 「excludes the Operation phase」前提を scope-grid 実体（default space の steering 対象外は別層）へ更新 | FR-2.2 |
| steering | `amadeus/spaces/default/memory/phases/operation.md`（7 行） | 根拠引用を「default space の steering 判断自身」へ補正 | FR-2.3 |
| boundary 文書 | `docs/amadeus/aidlc-v2-operation-phase-boundary{.md,.ja.md}` | 位置づけ更新（歴史的判断 #394 の記録 + 現行 2 層構造の案内）+ Decision 節断定文の補正（下限） | FR-2.4 |
| overview ツリー図 | `docs/amadeus/lifecycle/overview{.md,.ja.md}`（197 行のツリー内コメント「Amadeus does not run them / 実行対象にしない」） | 「run per scope-grid; default space skips via steering / scope-grid に従い実行、default space は steering で skip」の趣旨へ補正（reviewer it1 #2） | FR-2.1 / FR-2.5 |
| state | `docs/amadeus/lifecycle/state{.md,.ja.md}`（64 行「out of Amadeus's execution scope and are always `[S]` / 実行対象外であり、常に `[S]`」） | 2 層構造の記述へ補正（overview L86 と同型。reviewer it1 #1） | FR-2.5 |
| construction | `docs/amadeus/lifecycle/construction{.md,.ja.md}`（221 行「Because Amadeus excludes the Operation phase / Operation phase を対象外にするため」） | 「default space の steering が Operation を対象外にするため」へ補正（NFR-1(3) grep 対象文字列と完全一致のため必須。reviewer it1 #1） | FR-2.5 |

## 実体間の関係（変更後の姿）

- Operation の実行可否は 2 層で決まる: (1) lifecycle 契約層 = scope-grid（enterprise / feature / workshop = 7、infra = 4、security-patch = 2 の Operation ステージを EXECUTE で持つ。AMADEUS.md の CONDITIONAL 採用）、(2) workspace steering 層 = 各 workspace の memory/phases/operation.md（default space は対象外と定め、Operation を含む scope の Intent は理由付き skip で処理）。
- boundary 文書は「#394 時点の判断記録 + 現行は 2 層構造である」ことを冒頭で案内し、overview / scopes からのリンクは維持する（理由説明の参照先として引き続き有効）。
- rollout-plan の到達点（英語化完了）と退役の経緯は skill-language-policy 側の 1 段落だけが持つ（新文書なし、重複なし）。
