<?php
$conn = new mysqli('localhost', 'mahean_dbuser', 'GolpoDB2026!', 'mahean_golpodb');
if ($conn->connect_error) { die('Connect failed: ' . $conn->connect_error); }

// Check first story row
$r = $conn->query("SELECT pk, LENGTH(row_json) as len, SUBSTRING(row_json,1,100) as sample FROM `app_table_stories` LIMIT 3");
echo "=== app_table_stories sample ===\n";
while ($row = $r->fetch_assoc()) {
    echo "pk={$row['pk']} row_json_length={$row['len']} sample: {$row['sample']}\n\n";
}

// Try parsing row_json in PHP
$r2 = $conn->query("SELECT pk, row_json FROM `app_table_stories` WHERE pk=1");
$row2 = $r2->fetch_assoc();
if ($row2) {
    $parsed = json_decode($row2['row_json'], true);
    echo "=== Parsed story 1 title: " . ($parsed['title'] ?? 'NULL') . "\n";
    echo "JSON error: " . json_last_error_msg() . "\n";
    echo "Parts count: " . count($parsed['parts'] ?? []) . "\n";
}
$conn->close();
