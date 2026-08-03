# Risk and Sequencing Rationale — 260802-source-only-dist

上流入力(consumes 全数): unit-of-work-dependency(DAG と統合点)、bolt-plan.md(編成)、requirements(Constraints の順序拘束)、unit-of-work(u8 統合根拠)、unit-of-work-story-map(スライス順序)、components(患部規模)。

## シーケンス原理: risk-first + 依存強制

1. **最大リスクを Bolt 1 で実証**(G10): 外部境界(GitHub Release asset 配信・リダイレクトホスト・checksum・installer 二経路共存)に不確実性が集中。ここが通れば残りはリポ内で閉じる低リスク作業
2. **不可逆点を最後尾直前に隔離**(Bolt 7 = u8): 事実上不可逆な切替は、全前提(Bolt 1〜6)+クリーン環境検証の完了後にのみ、人間ゲート付きで実行
3. **依存は DAG が構造的に強制**: u8 の depends_on 全数により「installer 移行前の追跡除外」(installer 決定的破壊 — payload-factory.ts:44)と「正本昇格前の追跡除外」(self-* scope 恒久喪失)は編成上不可能

## Bolt 内順序をリスク制御として明示(intra-bolt-order-as-risk-control)

- **Bolt 1**: u1(asset 生成)→ u2(installer)の順。u2 の E2E 受け入れは u1 の draft release 実物を要するため。draft/prerelease を使い、本番リリースチャネルには触れない(検証は workflow_dispatch の dry-run + draft で行い、人間承認境界を維持)
- **Bolt 7(u8)内**: (1) 境界ガード・整合テストの期待値を切替後状態へ更新 →(2)`.gitignore` 反転+`git rm --cached`(作業ツリーのファイルは保持 — 削除しない)→(3)旧 check 撤去+第3ガード再定義+境界ガード有効化 →(4)落ちる実証(生成物を故意に stage して赤を実測 → revert push まで不可分の1セット — falling-proof-injection-one-set)。この順序は「検査空白ゼロ+CI 恒久赤ゼロ」を同時に守る唯一の並び(ADR-A8)
- **Bolt 4 → Bolt 5 直列**: promote-self.ts 交差(c6)。Bolt 5 は Bolt 4 着地後の実 diff で再接地

## リスク台帳(RAID 抜粋)

| リスク | 影響 | 緩和 | 検証方法 |
|---|---|---|---|
| asset リダイレクトホストの変動 | installer fail closed(過剰拒否) | ADR-A4 再実測条項。実装時に自リポ実 asset で確定 | Bolt 1 の E2E(実測) |
| 再現性の環境差(新規 tar 層) | asset 非決定化 | tar 正規化(名前順・mtime 固定・owner 0)+隔離2回 build 比較 | u1 のテスト+release CI の再現性検査 |
| u8 切替の見落とし面 | フレッシュクローン破損・CI 赤 | Bolt 1〜6 で前提を先行着地、移行順序4のクリーン環境検証をゲート添付資料に | Bolt 7 ゲート(人間) |
| 並行 Bolt の共有ファイル衝突 | merge 競合・工程記録消失 | worktree 分離+c6 交差判定+Bolt 4→5 直列化 | 着手前の目録突合+着地後の実 diff |
| 未実測 RAID の実装先送り | 「未実測領域で CI が落ちる」再演(unverified-raid-is-live-risk) | 各 Bolt の受け入れは requirements の名指し経路で実測(verify-on-the-named-path)。先送りはスコープ縮小としてユーザー裁定必須 | 各 Bolt の B&T |

## ロールバック方針

- Bolt 1〜6: 通常の PR revert で完全可逆
- Bolt 7(u8): revert は「dist 再コミット」を要する重い操作(ADR-A8 Reversibility)。ゲートで人間が切替可否を最終判断し、切替後の欠陥は前進修正を既定とする(履歴 rewrite 禁止 — deployment-pipeline:c3 と整合)
