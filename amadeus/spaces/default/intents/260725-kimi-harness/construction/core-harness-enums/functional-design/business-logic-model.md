上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Logic Model — core-harness-enums

unit-of-work.md の U4(完了定義: doctor arm の4チェック・`resolve --harness kimi` が subagent floor・`amadeus-harness.ts` の4定数に kimi・分岐テスト green)と unit-of-work-story-map.md の FR-4/FR-7d を、components.md C4 と component-methods.md の doctor arm チェック構成に沿って手続き化する(requirements.md の FR-4a/FR-4b/FR-4c と TC-4 が根拠)。services.md の判定どおり検査は読み取り中心の advisory。

## doctor arm(kimi)の検査フロー

1. ハーネス検出で `.kimi-code` が見つかった場合に本 arm を実行(`amadeus-harness.ts` の `KNOWN_HARNESS_DIRS` 追加で検出対象になる)
2. adapter 実在チェック: `.kimi-code/hooks/amadeus-kimi-adapter.ts` の存在
3. managed block 有無チェック: KimiHome 解決(U3 の共用規約: `$KIMI_CODE_HOME` ?? `~/.kimi-code`)の config.toml にマーカーを検出。不在時は手順 hint(setup CLI での導入または手動手順)を表示
4. バージョンフロア: `kimi --version` を取得し semver 比較(下限 = 実装時の実測版。既存 arm(codex の `MIN_CODEX`)の流儀で失敗扱い)
5. 機能 probe: 軽量な hook 発火確認。失敗しても advisory(hook は補助的でワークフロー自体は動く)
6. otherTrees リストに `.kimi-code` を追加(複数ハーネス共存の表示)

## swarm resolve の分岐

- `resolve --harness kimi` → `{ selected: subagent }`(ドライバ未指定時の既定 floor)
- 未知のドライバ指定 → fail-closed reject(既存 resolveDriver :118-136 の挙動)
- `claude-ultra`/`codex-ultra` 指定 → 既存の resolveDriver テーブルの挙動を継承するだけで、本 Unit では resolveDriver を一切変更しない(新しい degrade 経路は作らない)

## 検証シーケンス

- 分岐テスト(FR-7d): `--harness kimi` の subagent floor・未知 driver の fail-closed を in-process で断言
- doctor arm は codex/kiro 既存テストの様式に倣う(実在する tmp 構造でのチェック)

## 決定木(エラー経路)

- kimi バイナリ不在 → 「kimi CLI on PATH」の失敗行(pass:false)+ install 案内を出し、semver 比較は skip する(実装に合わせて 2026-07-25 に精緻化: codex arm の `MIN_CODEX` pin と同じ流儀 — FR-4a の「既存 arm の流儀に準拠し doctor チェック失敗」と整合。当初の「skip」設計から、未導入を静かに通さない方向へ変更)
- config.toml 不在 → managed block 不在として手順 hint(異常ではない)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T11:38:54Z
- **Iteration:** 1
- **Scope decision:** none

doctor arm の4チェック+otherTrees は FR-4a と整合し、編集範囲はサンクション3箇所、swarm は既存契約の継承のみ。検出3件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / BLM) requirements.md の本文参照を追記
- (minor / DE) component-methods.md 由来の明記を追記
- (minor / BLM) ultra 指定時の挙動を「既存継承・変更不能」と正確化
