# Performance Test Instructions — packaging-repair-batch

bugfix scope(Minimal depth)。#701 は --check 時の走査対象を dist ルート全域へ拡大するが、対象ツリーは小規模(各ハーネス数十ファイル)で CI 実測でも劣化は観測されない(スイート緑・所要時間は従来同等)。#702 は読込→検証→書込の順序変更のみで I/O 総量は不変。専用の性能テストは実施しない — org.md の bugfix テスト姿勢に従う。
