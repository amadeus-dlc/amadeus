上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Domain Entities — kimi-harness-docs

requirements.md の FR-8 と components.md C1(onboarding fills)をエンティティとして定義する。

## Entity: Harness Guide(en/ja)

- `docs/guide/harnesses/kimi-code.md` + `kimi-code.ja.md`
- 構成: prerequisites / install / hook wiring / doctor / what's different on this harness(既存章と同型)

## Entity: README 表

- `docs/guide/harnesses/README.md` のハーネス一覧表に kimi 行(前提バージョンと guide へのリンク)

## Entity: Onboarding Fills(参照関係)

- C1 の onboarding.fills.ts が AGENTS.md(プロジェクト配布物)を生成するのに対し、本 guide はユーザー向けの恒久文書。両者は snippet 正本を共有参照する(転記しない)

## 適用範囲

- U7 の完了定義(unit-of-work.md)と unit-of-work-story-map.md の FR-8 行に対応
- 前提セクションの実測源は component-methods.md の C4(doctor 4チェック)と C3(マージフロー)とする
- services.md の判定(実装確定後に書く)により、B1-B6 の成果物を入力とする

## 関係

- B1-B6 の着地内容 --実測として転記--> Harness Guide --表に追加--> README
- snippet 正本 --参照--> Harness Guide / Onboarding Fills
