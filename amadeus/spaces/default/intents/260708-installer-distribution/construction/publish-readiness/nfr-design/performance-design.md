# Performance Design — publish-readiness

> ステージ: nfr-design (3.3) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../nfr-requirements/performance-requirements.md`(pack テスト ≤30秒+ビルド10秒、ドリフト ≤1秒)・`tech-stack-decisions.md`

## テスト実行の構造(CI 予算内 — npm pack 呼び出し回数を明示)

実 `npm pack --dry-run --json` の呼び出しは**合計3回**(BR-P01: 合成出力での代替禁止):

| 呼び出し | 対象 | 用途 | 目安 |
|----------|------|------|------|
| 1回目 | 実物 packages/setup | 契約検査(satisfied 判定を複数アサーションで共有 — beforeAll で1回) | ≤8秒 |
| 2回目 | 変異コピー(LICENSE を files から除去) | missing 検出の常設実証(REL-P02) | ≤8秒+コピー I/O ≤2秒 |
| 3回目 | 変異コピー(契約外ファイルを files へ追加) | unexpected 検出の常設実証(REL-P02) | ≤8秒+コピー I/O ≤2秒 |

- 合計 ≤28秒 — nfr-requirements の pack テスト予算 ≤30秒に**3回分込みで**収まる(初回実装時に実測して記録)
- **実行順序**: `bun build`(遅延セットアップ、≤10秒別枠)→ 実物への1回目 → **ビルド済み dist/cli.js を含む状態で**変異コピー作成 → 2・3回目。コピーがビルドより先に走ると missing 検出が「ビルド未実施」を誤検出するため、順序をテストの beforeAll 連鎖で固定する(REL-P02 の実証の意味を守る前提条件)
- ドリフトテストは readFile+比較のみ(npm 起動なし、≤1秒 — 従来どおり)
