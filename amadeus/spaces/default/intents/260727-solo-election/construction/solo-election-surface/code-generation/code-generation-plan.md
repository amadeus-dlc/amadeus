# Code Generation Plan — solo-election-surface (U2)

**Intent:** 260727-solo-election | **Unit:** U2 surface | **Test strategy:** Comprehensive

## Step 1: SKILL.md 4節内挿

- [x] 起動: subagent-1/2 voters、発動3類型+明示発動、spawn 不能 loud 降格
- [x] 転送: spawn テンプレ({electionId}/{viewPath}/spawnInstruction+固定手順)、票未着再spawn 1回
- [x] 人間委譲: split/棄権/再議論 resume+amend 手順
- [x] 終了: 不変
- [x] t242 契約維持(BR-K1/K3/K4)

## Step 2: team.md ソロモード節改定

- [x] 2体 subagent 選挙の正規形態化
- [x] 発動規則を SKILL と同文
- [x] 2-0 即採用 / 割れケースはユーザーへ

## Step 3: テンプレート検査テスト

- [x] tests/integration/t269-election-solo-skill-template.integration.test.ts
- [x] t242 green 確認

## Step 4: Dist & self-install 同期

- [x] bun run dist (package.ts --apply)
- [x] bun run promote:self
- [x] dist:check / promote:self:check green

## Step 5: Docs 棚卸し

- [x] grep docs/ for election-specific solo content — 該当箇所なし(FR-13 docs 面 N/A)

## Step 6: Code summary

- [x] code-summary.md
