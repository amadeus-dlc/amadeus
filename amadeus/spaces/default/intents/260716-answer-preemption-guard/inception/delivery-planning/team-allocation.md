# Team Allocation — answer-preemption-guard

上流入力(consumes 全数): `../units-generation/unit-of-work.md`(単一 Unit)、`../units-generation/unit-of-work-dependency.md`(yaml edge)、`../units-generation/unit-of-work-story-map.md`、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜7)、`../application-design/components.md`(C-1〜C-5 目録)、`../practices-discovery/team-practices.md`(変更 0 件判定)。

## 割当

| 役割 | 担当 | 備考 |
|------|------|------|
| conductor | e4(本セッション)| leader ディスパッチ(20:59:49Z)による領域アフィニティ割当(#1101/#1106 実装者)|
| builder | e4 conductor 直営(単一 Bolt・単一 Unit のためインライン)| 並行 builder 上限(4)に抵触しない |
| stage reviewer | 独立 subagent(code-generation 段で起動)| 自己実装の自己レビュー禁止 — reviewer は別コンテキスト |
| PR reviewer | 実装者以外の空きメンバー(PR 発行時に指名)| independent-review-on-pr |

## 並行度と留意

単一 Bolt・直営 builder のため並行 builder 上限(1 intent あたり4)に非抵触。レビュー能力確保のため stage reviewer は毎回独立 subagent とする(role-model 準拠)。
