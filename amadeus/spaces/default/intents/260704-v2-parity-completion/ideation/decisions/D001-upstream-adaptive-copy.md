# D001：本家 dist/claude からの適応コピー

## 判断

本家 `dist/claude/`（MIT-0、基準 commit `fde1e1af7aae16f4c4defc991abaa3877ee2ac26`）からの適応コピーを基本戦略とする。
適応点は、skill 名の amadeus-* への改名と、質問提示の amadeus-grilling プロトコルへの結線の 2 つに限定する。
基準 commit は固定し、上流への追従は差分確認を経た明示的な Issue または Intent で行う。

## 根拠

- MIT No Attribution のため、コピーに法的制約がない。
- 再実装よりコピーのほうが、パリティ達成と挙動の安定（TS エンジンの決定論）を同時に満たす。
- 人間の指示（Q4 訂正回答、feasibility Q3）。

## 影響

- パリティ検査は名前写像（aidlc-* ↔ amadeus-*）と除外リストを前提にする。
- 本家改変は結線層の最小点に限定し、除外リストへ記録する。

## 由来

G001 の GD001、constraint-register の C003。
