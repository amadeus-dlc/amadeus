# Bolt Plan — standing-delegation-grant(Issue #1125)

上流入力(consumes 全数): `../units-generation/unit-of-work.md`(単一 Unit standing-grant)、`../units-generation/unit-of-work-dependency.md`(edge block・bolt_dag 非 null 実測済み)、`../units-generation/unit-of-work-story-map.md`(FR トレース)、`../application-design/components.md`(C-1〜C-6)、`../requirements-analysis/requirements.md`(FR-1〜8)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## Bolt 列(単一 Bolt)

| Bolt | Unit | スコープ | 完了条件 |
|------|------|---------|---------|
| Bolt 1 | standing-grant(1:1) | C-5(taxonomy/EVENT_HEADINGS/保護イベント)→ C-1(grant/revoke verb)→ C-2(受理検証+C-3 分類・approve 側のみ)→ C-4(doctor)→ C-6(テスト: 赤側6種+白側 sweep+一時状態 fixture+round-trip)+docs 明文(e2 留保)+dist/self-install 再生成 | 全 AC(FR-1〜7)充足、検証列(typecheck/lint/dist:check/promote:self:check/--ci/runner-gen check)全 exit 0、local lcov patch 未カバー 0、PR 発行+非実装レビュアー READY、ユーザーマージ承認 |

## 実行手順(builder ディスパッチ)

1. worktree 隔離(base=origin/main)で builder subagent へディスパッチ(c2 規律・deviation-stop・同期完遂の標準文言込み)
2. 実装順序は AD component-dependency の直列(C-5→C-1→C-2→C-4→C-6)
3. 検証・落ちる実証・lcov を builder 内で完遂 → conductor が c5 手順(差分検分+検証再実行)で検収 → architecture-reviewer → Bolt PR

## Walking Skeleton

なし — amadeus スコープ(incremental)+ユーザー標準指示(4)。org.md のスケルトン既定(greenfield 列挙)に amadeus は含まれない。

## 並行 intent との交差(c6)

amadeus-state.ts / amadeus-lib.ts / amadeus-audit.ts / amadeus-utility.ts を編集 — 並行 intent(metrics-retention-gc = scripts/ci.yml 面 / teamup-msg-backend = scripts/team-up.sh 面)と**正本ファイル単位で非交差**(静的目録)。着手時に先行着地 PR の実 diff で再判定する(c6 の実 diff 判定)。
