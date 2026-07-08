# Personas — インストーラの実装(installer-distribution)

> ステージ: user-stories (2.4) / 作成: 2026-07-08
> 出典: `../../ideation/intent-capture/stakeholder-map.md`、`../requirements-analysis/requirements.md`、`../practices-discovery/team-practices.md`、codekb `business-overview.md`・`component-inventory.md`、`user-stories-questions.md` Q2

## P1: 新規ユーザー — 「はじめての Amadeus」

- **像**: AI-DLC に興味を持った外部の OSS 利用者。既存プロジェクトに Amadeus を試したい開発者
- **目標**: リポジトリをクローンせず、`bunx @amadeus-dlc/setup install` の1コマンド・1分以内で使い始める
- **痛点**: 手動コピー(`cp -r dist/<harness>/...`)の煩雑さ、ハーネス取り違え、コピー漏れ
- **文脈**: Bun または Node のどちらかは導入済み。ハーネス(claude/codex/kiro/kiro-ide)は自分で選びたい(自動検出は望まれていない)
- **優先度**: 最上位(成功指標1・2の主体)

## P2: 既存ユーザー — 「壊さずに最新へ」

- **像**: すでに Amadeus を導入し、skills やルールにカスタマイズを加えたプロジェクトのオーナー
- **目標**: 自分のカスタマイズを失わずに最新版へ更新する。適用前に何が変わるかを知る
- **痛点**: 更新手段がなく古い版に取り残される。手動上書きでカスタマイズを失う事故への恐怖
- **文脈**: 導入経路はインストーラ(マニフェストあり)とは限らず、手動コピー(manual-or-unknown)の場合もある
- **優先度**: 上位(成功指標3の主体)

## P3: メンテナ — 「低負荷で安全に配る」

- **像**: このリポジトリの保守者。リリース・publish・タグ発行を担う
- **目標**: publish とタグ発行を手順書で低負荷に回し、メタデータ不備(license/repository)や同梱物の欠落を公開前に機械検出する
- **痛点**: 手順の暗黙知化、公開事故(誤メタデータ・ファイル欠落)、二重バージョン(framework/setup)の混乱
- **文脈**: CI 自動 publish は初回スコープ外。`vX.Y.Z` タグ規約は新設されたばかり
- **優先度**: 中位(配布経路の持続可能性を支える)

## ペルソナ関係と優先順位

P1 → P2 は同一人物の時間発展(導入した新規ユーザーは次の更新で既存ユーザーになる)。P3 は P1/P2 の体験を供給する側。ストーリー優先度は P1(Must 中心)≧ P2(Must 中心)> P3(Must/Should 混在)。
