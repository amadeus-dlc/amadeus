# Build vs. Buy — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md

## 結論: Build

market-research-questions.md Q5/Q6 の回答に基づき、本機能は自社(Amadeus)実装(Build)一択とする。

## 根拠

- **規模**: `amadeus-state.md` 冒頭または各ステージ `memory.md` への数フィールド追加、環境変数からの自動検出ロジック、監査シャードイベントへの付記(比較検討)という、数十〜百行規模の内部スキーマ拡張である。外部ベンダー・OSS 採用に見合う汎用性・規模を持たない
- **代替候補の不在**: 「AI エージェント実行証跡」を汎用に扱う SaaS/OSS は本 intent-capture 時点で把握していない。仮に存在しても、Amadeus 固有の `amadeus-state.md`/stage `memory.md`/監査シャードという既存スキーマへの統合が必須であり、外部ツールをそのまま採用できる余地は薄い(feasibility ステージで実測確認する)
- **既存資産の再利用**: 検出方法として各ハーネスが公開する環境変数(`$CLAUDE_CODE_*` 等)を使う設計であり、これは Buy ではなく Build の枠内での既存資産(ハーネス側が既に提供する識別子)の再利用である

## Alternatives Rejected

- **買収/外部 SaaS 導入**: 対象候補が不在、かつ Amadeus 固有スキーマへの統合コストが避けられないため却下
- **何もしない(現状維持)**: Issue #1452 の背景が示すとおり、障害調査時の実害(#1449・#1450 調査でハーネス種別を特定できなかった)が既に発生しており、現状維持は却下
