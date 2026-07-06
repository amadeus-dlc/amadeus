# Mob Composition — 260706-installer-versioning（Issue #543）

上流入力: [team-assessment.md](team-assessment.md)

## 構成

mob（複数人での同時作業）は組まない。単独 conductor（engineer2）+ 独立 reviewer の構成とする。

## 根拠

- 変更対象は scripts/amadeus-install.ts と installer eval に閉じ、接触面は順序制約（#577 = merge 済み）で解消済み。
- 多体連携の並行は Intent 単位（team.md）であり、Intent 内の mob は前例・必要性ともにない。
- 設計論点はピア協議（6 名一致）で確定済みで、実装中の合議点は gate と §12a reviewer が担う。
