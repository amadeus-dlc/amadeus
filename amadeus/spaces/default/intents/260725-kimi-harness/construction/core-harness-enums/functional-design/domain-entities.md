上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Domain Entities — core-harness-enums

requirements.md の FR-4 と components.md C4 をエンティティとして定義する。DoctorCheck の4チェック構成は component-methods.md の C4 doctor arm 表をそのままエンティティ化したもの。

## Entity: HarnessType 拡張

- `"kimi"` を union に追加(`amadeus-harness.ts:5-12` の既存形に同形追加)
- `HARNESS_DIR_TO_TYPE`: `.kimi-code → kimi`
- `KNOWN_HARNESS_DIRS`: probe 順の末尾に `.kimi-code`
- `KNOWN_RULES_SUBDIR`: `.kimi-code → rules`

## Entity: DoctorCheck(kimi arm)

- `{ adapter: "present|missing", managedBlock: "present|missing", version: "ok|below-floor|not-installed", probe: "ok|advisory-fail" }`
- 各チェックは独立に判定し、1つの失敗が他を止めない(既存 arm の流儀)。バイナリ不在・バージョン解釈不能は "not-installed"(失敗行+install 案内)、config.toml 不在は "missing"(手順 hint) — 決定木の精緻化(2026-07-25)どおり "unknown" は到達不能

## Entity: SwarmResolution(kimi)

- `{ kind: "selected", driver: "subagent" }` — 既定 floor
- `{ kind: "rejected" }` — 未知 driver(fail-closed)
- 既存の resolveDriver 契約に載るだけで、kimi 固有の driver は導入しない

## 適用範囲

- U4 の完了定義(unit-of-work.md)と unit-of-work-story-map.md の FR-4/FR-7d 行に対応
- services.md の判定(検査は読み取り中心)により、エンティティ間の共有状態は導入しない

## 関係

- HarnessType 拡張 --検出対象化--> doctor arm / runtime の harnessDir 解決
- SwarmResolution --`resolve --harness kimi`--> conductor の fan-out 判断
