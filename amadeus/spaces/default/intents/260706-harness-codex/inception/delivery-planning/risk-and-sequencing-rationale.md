# Risk and Sequencing Rationale — 260706-harness-codex

## 上流入力

[requirements.md](../requirements-analysis/requirements.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md)、[team-practices.md](../practices-discovery/team-practices.md)。

## 順序の根拠

FR-1 → FR-2 → FR-3 → FR-4 → FR-6.5 → FR-5 → FR-6 の直列順は内容依存（FR-1 の照合結果が FR-3 の取り込み内容を確定、FR-2 の写像表が FR-3 の対象を確定、FR-6.5 は FR-4 の新設文書を検出対象に入れてから FR-6.4 を走らせるため FR-5 の前）で固定。WSJF 的な経済順序付けは単一 Bolt のため適用対象がない。

## リスクと手当て

| リスク | 手当て |
|---|---|
| 上流 yaml が A-1（全件同内容 guard）と異なる | FR-1.2 で全件照合し、相違があれば上流実体を正として取り込み、provenance に記録（NFR-2） |
| 写像表で上流 38 skill に amadeus 対応が欠ける | FR-2.2 / 未解決事項どおり取り込み対象外として表に明記（推測で対応 skill を作らない） |
| main の並行 merge（engineer1 / 3 / 5 の PR）との交差 | 変更対象が非接触確定済み。PR 作成前に origin/main へ追従し union 解消（恒常運用ルール） |
| promote 昇格での既存ファイル巻き込み | promote は skill dir 全置換のため、対象 skill の既存構成を昇格前後で diff 確認する（FR-5.2 の test:it:promote-skill も網） |
