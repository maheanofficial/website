<?php
$conn = new mysqli('localhost', 'mahean_dbuser', 'GolpoDB2026!', 'mahean_golpodb');
if ($conn->connect_error) { die('Connect failed: ' . $conn->connect_error); }
$result = $conn->query('SHOW TABLES');
$tables = [];
while ($row = $result->fetch_array()) {
    $tname = $row[0];
    $cnt = $conn->query("SELECT COUNT(*) as c FROM `$tname`")->fetch_assoc()['c'];
    $tables[$tname] = $cnt;
}
echo json_encode($tables, JSON_PRETTY_PRINT);
$conn->close();
