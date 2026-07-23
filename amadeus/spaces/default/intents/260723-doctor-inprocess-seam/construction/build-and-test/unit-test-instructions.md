# Unit Test Instructions — Doctor in-process seam

## 上流成果物

- `construction/doctor-inprocess-seam/code-generation/code-generation-plan.md`
- `construction/doctor-inprocess-seam/code-generation/code-summary.md`

Test Strategy は `Minimal` であり、FR-1〜FR-6 と NFR-1〜NFR-4 を直接追跡する。
filesystem/process を使う t257 は repository の test-size ratchet に従い integration
directory にあるが、要求駆動の core test set として本手順に含める。

## Framework と test data

- Framework: Bun test
- Fixture: 各 test が所有する一時 directory と immutable `DoctorContext`
- 共有 mutable state を使わず、child process は必ず kill/reap する
- production data、外部 network、秘密情報は使用しない

## 実行コマンド

```bash
bun test tests/integration/t257-doctor-inprocess-seam.test.ts
bun test tests/unit/t37.test.ts tests/unit/t83-doctor-orphan-worktree.test.ts
```

## 要件対応

| 要件 | 主な検証 |
|---|---|
| FR-1、FR-2 | `handleDoctor(context)` の同期結果と exit code |
| FR-3 | CLI wrapper の stdout/exit 契約 |
| FR-4、NFR-4 | context 解決後の env/platform/時刻変更に対する不変性 |
| FR-5、NFR-1 | audit、stale lock、fatal の互換性 |
| FR-6、NFR-2 | in-process と spawn の二層契約 |
| NFR-3 | canonical helper 再利用と immutable snapshot |

## 成功条件と coverage

- t257 は11/11成功
- unit guard suites は全件成功
- project line coverage は80%以上
- runtime-erased 型注釈を除く patch 実行可能行は100%
