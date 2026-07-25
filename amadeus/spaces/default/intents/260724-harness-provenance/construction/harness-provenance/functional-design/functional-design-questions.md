# Functional Design Questions — harness-provenance

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

## 設計前提

unit-of-work.md と unit-of-work-story-map.md は、Harness DetectorとHarness Recorderをcanonical unit `harness-provenance` 一つへ統合している。requirements.md のFR-1〜FR-4、components.md の3責務、component-methods.md の `detectHarnessType(): HarnessType`、services.md の同一プロセス内同期呼出を維持する。

既決事項は再質問しない。Application Design再承認後の検出優先順位は `AMADEUS_HARNESS_TYPE` → `CLAUDECODE=1` → provenance付き`resolveHarnessDir()` → `unknown`、stateのHarnessは7値 union、memory.mdは既存4見出しの通常エントリ本文だけを使う。既存`harnessDir(): string`はresolverの`dir`だけを返して公開互換性を維持する。

## Q1. `AMADEUS_HARNESS_TYPE` が既知の7値以外だった場合の扱いは?

[Answer]: A — `unknown` を返し、自動検出へはフォールスルーしない。明示overrideの設定ミスを別の検出値で隠さず、intent birth自体は継続する（2026-07-24T17:25:59Z、Mode: Guide me）

- A. `unknown` を返し、自動検出へはフォールスルーしない。明示overrideの設定ミスを別の検出値で隠さず、intent birth自体は継続する（推奨）
- B. 無効値を無視し、`CLAUDECODE`・dot-dirの自動検出へフォールスルーする。処理は継続できるが、設定ミスが見えなくなる
- C. 例外としてintent birthを失敗させる。誤設定は強く検出できるが、現在の `detectHarnessType(): HarnessType` 契約をResult/throwへ変更する必要がある
- X. Other (please specify)

## Q2. FR-4の `Harness=<type>` をmemory.mdへ記録するタイミングは?

[Answer]: A — conductorが各stageで最初の実観測をdiaryへ書く際、その通常エントリ本文に `Harness=<type>` を併記する。ハーネス情報だけのsynthetic entryは作らない（2026-07-24T17:25:59Z、Mode: Guide me）

- A. conductorが各stageで最初の実観測をdiaryへ書く際、その通常エントリ本文に `Harness=<type>` を併記する。ハーネス情報だけのsynthetic entryは作らない（推奨）
- B. stage開始時に専用diary entryを必ず追加する。確実だが、観測がないfresh memoryの`total=0`という既存不変条件と運用上のノイズを増やす
- C. `ensureStageDiary()` が自動追記する。確実だが、ADR-3の「テンプレートコピー処理は変更しない」と矛盾し、実装スコープも拡大する
- X. Other (please specify)

## Q3. `harnessDir()` が実際の`.claude`とfallback `.claude`を区別できない問題をどう解消するか?

[Answer]: A — Application Designへ戻り、既存 `harnessDir(): string` の互換性を保ちながら、内部に検出元（env / script-path / cwd-probe / fallback）を保持するresolverを設計する。`detectHarnessType()` はsource=fallbackだけを`unknown`にする（2026-07-24T17:28:19Z、Mode: Guide me）

実コードの `deriveHarnessDir()` は、env → script-path → CWD probeのいずれでも決まらない場合に `.claude` を返す。公開 `harnessDir()` は文字列だけを返すため、その `.claude` が実検出かfallbackかというprovenanceを失う。このまま `HARNESS_DIR_TO_TYPE` へ渡すとfallbackも`claude-code`になり、requirements.md AC-3cの`unknown`と矛盾する。

- A. Application Designへ戻り、既存 `harnessDir(): string` の互換性を保ちながら、内部に検出元（env / script-path / cwd-probe / fallback）を保持するresolverを設計する。`detectHarnessType()` はsource=fallbackだけを`unknown`にする（推奨）
- B. requirements.md AC-3cを変更し、fallback `.claude` も`claude-code`として扱う。実装は簡単だが、承認済み仕様を変更し誤記録を許容する
- C. `CLAUDECODE=1`がない限り`.claude`を常に`unknown`とする。fallbackは解消するが、env markerのない正当なClaudeインストールも誤判定する
- X. Other (please specify)

解決済み: Application DesignのADR-5で内部`HarnessDirResolution`と`resolveHarnessDir()`を採用し、Architecture Reviewer iteration 2でREADY。通常intent birthは明示envまたは全6配布形態のscript-pathでCWD probeより前に確定することもAC-3dの設計不変条件として承認済み。
