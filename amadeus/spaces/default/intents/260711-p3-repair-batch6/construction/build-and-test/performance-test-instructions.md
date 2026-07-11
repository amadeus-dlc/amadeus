# Performance Test Instructions — p3-repair-batch6

本 intent は性能要件を持たない(バグ修正のみ・ホットパス変更なし)。専用の性能テストは作成しない。

- 退行監視はフルスイートの wall-clock(runner の dynamic test-size 計測、#699 系)で代替。
- #840 の走査一般化は深さ6キャップ・SCAN_EXCLUDE・symlink 除外を保全しており、走査コストの上界は従来と同等(受け入れ基準2で保全をテスト固定済み)。
