<?php
$conn = new mysqli('localhost', 'mahean_dbuser', 'GolpoDB2026!', 'mahean_golpodb');
if ($conn->connect_error) { die('Connect failed: ' . $conn->connect_error); }

// Check columns in app_table_stories
$cols = $conn->query("DESCRIBE `app_table_stories`");
echo "=== COLUMNS ===\n";
while ($r = $cols->fetch_assoc()) echo $r['Field'] . ' ' . $r['Type'] . "\n";

// Sample first 2 rows
$rows = $conn->query("SELECT * FROM `app_table_stories` LIMIT 2");
echo "\n=== SAMPLE ROWS ===\n";
while ($r = $rows->fetch_assoc()) echo json_encode($r) . "\n";

// Also check app_table_rows (D1-style) for stories
$d1 = $conn->query("SELECT COUNT(*) as c FROM `app_table_rows` WHERE table_name='stories'");
echo "\n=== D1 app_table_rows stories count: " . $d1->fetch_assoc()['c'] . "\n";
$d1sample = $conn->query("SELECT pk, table_name, LEFT(row_json,200) as rj FROM `app_table_rows` WHERE table_name='stories' LIMIT 1");
echo "D1 sample: " . json_encode($d1sample->fetch_assoc()) . "\n";
$conn->close();
