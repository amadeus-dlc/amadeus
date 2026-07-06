# Initiative Brief — 260706-installer-versioning（Issue #543）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[scope-document.md](../scope-definition/scope-document.md)、[competitive-analysis.md](../market-research/competitive-analysis.md)、[feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md)、[team-assessment.md](../team-formation/team-assessment.md)、[wireframes.md](../rough-mockups/wireframes.md)、[intent-backlog.md](../scope-definition/intent-backlog.md)

## 一言要約

インストーラに「版の判別」と「ハッシュによるカスタマイズ検出 + 退避型更新」を導入し、無言上書きによる利用者の変更喪失をなくす。

## Inception への引き継ぎ内容

1. **確定済み設計**（ピア協議 6 名全問 A 一致 + gate 承認済み）: manifest（commit + 導入時刻 + sha256 全ファイル表、target 直下）、退避型（集中退避 dir `.amadeus-install-backup/<導入時刻>/`）、削除は再作成、bootstrap は保守的退避。
2. **様式の骨子**（rough-mockups、§12a 反復 2 READY）: manifest JSON、混合形式出力（prefix 行 + [n/5] ステップ行、退避・再作成の必ず告知）、版確認 1 行 + fix: ヒント。
3. **成功条件** = Issue 受け入れ条件 4 点（intent-statement）。
4. **制約** C-1〜C-8（constraint-register）。特に非対話 1 コマンド・冪等・amadeus/ 不可侵・AMADEUS.md 変換後 hash。
5. **Inception で確定する事項**: manifest ファイル名、版確認入口の形（flag / subcommand）、退避 dir 時刻表記、manifest 自身の files 表への含否（rough-mockups-questions の割り当てどおり）。

## リスクと依存（RAID 要約）

- bootstrap の 2-way 制約は協議 Q6 で解決済み（保守的退避）。
- #572（skills/ restructure）とは接触薄の見込み。skills/ に触れる変更が出たら leader へ一報。
- #579（fable 混入）はバックログ分離済み（3-way 意味論による分離安全性の証明つき）。
- 順序制約の対象 PR #577 は merge 済み（Construction 前提解消）。

## 体制

engineer2 単独実装 + §12a reviewer + Codex 初見（team-assessment）。merge は人間。
