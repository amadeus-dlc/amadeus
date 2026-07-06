# Risk and Sequencing Rationale — Engine Installer（260705-engine-installer）

上流入力: [bolt-plan.md](bolt-plan.md)、[raid-log.md](../../ideation/feasibility/raid-log.md)

## 順序の根拠

- **skeleton 先行（B001）**: 最大のリスクは「cold cache + オフラインで全 tools/hooks が module load できるか」（A-1）と「配置 + symlink + マージの縦切りが成立するか」であり、これらを最初の Bolt で end-to-end に潰す。異常系（B002）は骨格が立ってからの積み増しで、手戻りが局所化する。
- **eval 骨格の最先行**: TDD（NFR-1、DR-1）により、B001 の最初の作業は失敗する eval である。RED の確認をもって実装を開始する。

## リスク対応の割り付け

| リスク | 対応 Bolt |
|---|---|
| R-1（並行 Intent のレイアウト変更） | B001（FR-2.5 の一致検査を骨格に含める = 早期検知を最初から有効化） |
| R-2（既存実体との衝突） | B002（FR-2.9） |
| R-3（JSON マージ） | B001 で正常系マージ、B002 で不正 JSON・複数ブロック（AD-6） |
| O-2（スモーク方式） | B001 で暫定実装（doctor 相当の起動）、B002 で確定（exit code 扱いを含む） |
