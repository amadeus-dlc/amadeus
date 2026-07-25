# Risk and Sequencing Rationale — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, mockups.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

## シーケンス判断

walking-skeleton-firstを採用する。unit-of-work-dependency.md のDAGは単一ノードで、unit-of-work.md と unit-of-work-story-map.md は検出・state記録・memory運用証跡・docs・配布検証を一つのdeployable Unitへ統合している。したがって経済価値・リスク低減・依存順序はいずれも同じBoltを指し、WSJFを計算しても順位は変わらない。

旧2ユニット分割は、Harness Detectorだけではstories.mdの利用シナリオを出荷できず、DetectorとRecorderを同一Boltへ束ねると1 Unit/Bolt/PR境界を壊すため採用しない。後方ジャンプで単一Unitへ是正済みであり、DAGからの順序逸脱はない。

## 主要リスクと前倒し検証

| リスク | 影響 | Bolt内の緩和・検証 |
|---|---|---|
| harness検出優先順位の誤り | 誤ったHarness値を永続化 | requirements.md FR-1〜FR-3のoverride→Claude env→provenance付きdot-dir→unknownをunit testで固定。invalid overrideはunknownへfail-closed |
| 実検出`.claude`とfallback `.claude`の混同 | 検出不能をClaude Codeとして誤記録 | 内部`HarnessDirResolution.source`を保持し、fallbackだけunknownとなる分岐をunit testで固定 |
| 通常birthでCWD probeへ到達 | 複数dot-dir同居repoで誤検出 | 全6配布形態の投影済み`tools`経路でenvまたはscript-pathが先に確定するAC-3d統合テストを実行 |
| canonical mappingとCWD候補の混同・ドリフト | 新ハーネス追加時の誤写像 | `HARNESS_DIR_TO_TYPE`を記録対象の正準定義とし、key/value全件をテスト。`KNOWN_HARNESS_DIRS`はCWD probe候補順に限定 |
| 既存V7 stateの破壊 | 既存intentが読めない | Harnessをoptional追加とし、既存state regressionを実行 |
| memory.mdの構造変更 | t100不変条件と後方互換性を破壊 | 通常diary本文だけへ記録し、4見出し・`total=0`を検証 |
| mockups.mdのCLI契約との乖離 | 利用者が判定根拠を理解できない | verdict別文言・exit codeをintegrationで照合 |
| core正本と配布物のドリフト | 一部ハーネスだけ旧挙動 | team-practices.mdどおりpackage/promote後に2つのdrift checkを実行 |
| Application Designからの無申告逸脱 | レビュー済み契約を破壊 | components.md、ADR-5、story mapをレビュー観点に固定し、逸脱時は停止・裁定 |

## WSJF不使用の理由

対象Boltが一つだけなので、Reinertsen/SAFe WSJFの分子・分母を推定しても意思決定は変わらない。根拠のない数値を作らず、Definition of Doneへ具体的なリスク低減検査を埋め込む。
