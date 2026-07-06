# Business Rules — no-stub-lint

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 判定規則

- BR-1: 判定は 2 値である。finding が許可リスト（対象 glob × カテゴリの一致 + 維持理由・終了条件の非空）に載っていれば pass、載っていなければ fail（FR-2.1）。
- BR-2: 維持理由または終了条件が空のエントリは宣言として無効であり、照合に使わない（.agents/rules/backward-compatibility.md の 3 要素契約の機械化）。
- BR-3: fail メッセージは「何が・どこで・どのカテゴリで」検出されたかと、pass に転じる宣言の書式（表への行追加例）を含む（FR-2.3）。
- BR-4: コメント・文字列レベルの検出 keyword は「後方互換」の 1 語だけとし、legacy / shim / compat / deprecated はシンボル・alias レベルでのみ検出する（FR-1.2 の境界。誤検知源となる説明散文を対象化しない）。
- BR-5: scan scope は既存 rule の defaultInclude と同一とし、`.agents/amadeus/`（エンジン、parity 管理）と record 文書（*.md、#501 の参照台帳 stub を含む）は対象外（FR-1.2b、FR-1.4）。
- BR-6: 検出パターンの拡張（新カテゴリ追加）は本 Intent では行わない。旧 path フォールバック分岐の意味的検出は #529 へ委ねる（FR-1.2c）。
- BR-7: 許可リストの既存節（record 互換の台帳）には手を入れない。lint 用の宣言は新設の「Lint 許可リスト」表に閉じる（O-2）。
- BR-8: 本 rule 自身の実装・eval が検出語を含むことによる自己ヒットは、scan 対象からの除外ディレクトリ追加では対処しない（自己参照の穴を作らない）。優先順: (1) 命名回避 = rule 実装の識別子名に legacy / shim / compat / deprecated を含めない（rule 名由来の `noStubCompat` 系は compat を含むため、実装識別子は別語彙にする） (2) 検出パターン定義・fixture 内の検出語は分割表記（文字列連結）で自己ヒットを避ける (3) それでも残る自己ヒットは許可リストへ明示宣言する（宣言計画表への追加行）。eval には「実ツリーへの --check 実行が宣言込みで pass する」検査を含め、自己参照の回避を手動確認でなく回帰テストとして固定する。
