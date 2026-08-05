# Performance Test Instructions — 260805-cross-harness-resume

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 判定: 専用の性能テストは生成しない(N/A、根拠付き)

Test Strategy は Comprehensive だが、性能検査は承認済み NFR と実在境界へ trace できる範囲だけ生成する(`cid:build-and-test:bt-proportional-selection` / `c3`)。

- requirements.md の NFR-1〜NFR-4 に性能要件は存在しない(NFR-1 = env 非依存、NFR-2 = fail-closed 維持、NFR-3 = テスト配置、NFR-4 = 台帳)— 実測: requirements.md「非機能要件」節の全数読解
- 変更面(caller-authorization の判定・session-takeover verb・SessionStart hook)はいずれも単発 CLI/hook 実行であり、常駐サービス的な負荷面を持たない
- 既存の性能ゲート(テストサイズ分類 ratchet、wall-clock drift 監視)は run-tests 常設で本 run にも適用されている — 新規テスト3件(t448/t449/t450)はいずれも size 分類の範囲内で完走

戦略名だけを根拠にした負荷試験の機械追加は行わない。生成しなかった検査はこの根拠とともに本成果物へ明記した。

## 常設ゲートによる代替被覆

専用テストは生成しないが、性能面の退行は次の常設機構が本 run でも実測被覆している:

- **テストサイズ分類 ratchet**(run-tests 常設): 新規3テスト(t448/t449/t450)は integration/medium の宣言サイズ内で完走(size purity 違反 0)
- **wall-clock drift 監視**: 最終 run の drift 8件はすべて既存ファイルで、本 intent の新規・変更テストは含まれない(tests/logs/2026-08-05T22-25-01Z のサマリ実測)
- takeover verb は単発 CLI 実行であり、実行時間は integration テストの実測(t450 全13テストで数百 ms〜数秒)に内包される

