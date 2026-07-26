上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Logic Model — setup-hooks-merge

unit-of-work.md の U3(完了定義: managed block の冪等マージ・既存保持・マーカー限定除去・バックアップ・壊れた TOML loud fail が単体テストで green)と unit-of-work-story-map.md の FR-3/FR-7c を、components.md C3 と component-methods.md の C3 インターフェース(renderManagedBlock/planMerge/applyMerge/removeManagedBlock)に沿って手続き化する。requirements.md の FR-3(特に FR-3a の既存 `[[hooks]]` 保持 — 実測14件)と OC-1 が根拠。services.md の協調表どおり、install/upgrade の wizard フロー内で plan report → confirm → apply の直列。

## マージフロー(install/upgrade 組込み)

1. setup CLI が dist/kimi を配置後、snippet 正本(`hooks/amadeus-hooks.snippet.toml`)を読む
2. `renderManagedBlock(snippet)` でマーカー囲みブロックを生成
3. `planMerge(configText, block)`(configText は文字列。ファイル不在時は `""` として扱う規約):
   - config.toml 不在(configText = "") → action: "add"(新規作成案内)
   - managed block 不在 → action: "add"(末尾追記)
   - managed block が同一内容 → action: "noop"
   - managed block が旧内容 → action: "replace"(マーカー内のみ置換)
   - managed block が2組以上検出(過去の異常) → loud fail(自動修復しない。手動解決を案内 — domain-entities.md §ManagedBlock の規定どおり)
   - TOML として不正 → loud fail(IoError。上書きしない)
4. plan report(FR-007 相当の既存レポート)に managed block の差分を追加表示
5. wizard の `confirm()` で承認。拒否時は変更なし + 手動手順を表示(BR-I18 流儀)
6. 承認時: バックアップファイル(`config.toml.amadeus-backup-<ISO>`)を作成し、既存 `apply-write` port 経由で atomic に書込み

## 除去フロー

1. `removeManagedBlock(configText, block)`: マーカー囲みの領域だけを削除。block は内容検出の identity 参照(二重識別に必須)。マーカー不在は内容検出で処理し、どちらも見つからなければ noop
2. 除去も plan 表示 + confirm の同じ導線を通す

## 検証シーケンス(単体テスト、FR-7c)

- add: 空の config・既存 `[[hooks]]` あり(14件相当)で既存ブロックがバイト保持される
- noop: 同一 block 再適用で diff なし
- replace: 旧 block が新 block に置換され、他の記述は保持
- loud fail: 構文不正の config で例外(IoError)になり、ファイルが変更されない
- atomic: 書込み途中の kill でも中間状態が残らない(apply-write の tmp→rename)
- 除去: マーカー内のみ消え、既存ブロックは保持

## 決定木(エラー経路)

- snippet 不在(dist 破損) → loud fail(導入異常。黙って進めない)
- config が読めない(permission) → loud fail と手動手順の提示
- 非対話環境 → 既存 install/upgrade と同じ規則(wizard の非対話既定に従う)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T11:31:13Z
- **Iteration:** 1
- **Scope decision:** none

render → planMerge → plan report → confirm → backup → atomic の流れは既存流儀と整合し、action 集合と除去フローは完備。検出4件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / BLM) config 不在時の入力規約を明記(空文字)
- (minor / DE) 重複 managed block の扱いを loud fail で明記
- (minor / DE) 本文上流参照を追記
- (minor / BLM) FR-3/14件の帰属を明記
