# Risk and Sequencing Rationale — standing-delegation-grant

上流入力(consumes 全数): `../units-generation/unit-of-work.md`(単一 Unit standing-grant)、`../units-generation/unit-of-work-dependency.md`(edge block・bolt_dag 非 null 実測済み)、`../units-generation/unit-of-work-story-map.md`(FR トレース)、`../application-design/components.md`(C-1〜C-6)、`../requirements-analysis/requirements.md`(FR-1〜8)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## 順序根拠

C-5 先行(taxonomy が verb の emit 前提)→ C-1(行の書き手)→ C-2(行の読み手)→ C-4(読み手の再利用)→ C-6(全数検証)— 依存方向どおりの直列。単一 Bolt につきシーケンシング上のリスクは worktree 内で閉じる。

## リスクと手当(raid-log R-1〜R-5 の実装面)

| リスク | 手当 |
|--------|------|
| R-1 scope 逸脱(P4)| 赤側 (1)(6) の落ちる実証+除外は定数列挙(AC-4d) |
| R-2 TTL 型不正 fail-open | parse→比較+赤側 (5) |
| R-4 ソロ漏出 | 両側 env 判定+赤側 (4) |
| R-5 偽 provenance | HUMAN_TURN 実在照合+PRESENCE_PROTECTED_EVENTS(赤実証は mint 拒否テスト) |
| 実装中の要件逸脱 | deviation-stop 標準文言+E-SDG-AD2 で確定済みの approve 限定を builder プロンプトに明記 |
