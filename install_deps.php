<?php
// install_deps.php - Run npm install for Node.js app
// Access this file via browser: https://www.mahean.com/main_mahean.com/install_deps.php

echo "<h1>Installing Node.js Dependencies</h1>";
echo "<pre>";

// Change to app directory
chdir('/home/mahean/public_html/main_mahean.com');

echo "Current directory: " . getcwd() . "\n";
echo "Running: npm install\n\n";

// Run npm install
$command = 'npm install 2>&1';
$output = shell_exec($command);

echo "Output:\n";
echo $output;

echo "\n\nDone! Check if node_modules was created.\n";

// Check if node_modules exists
if (is_dir('node_modules')) {
    echo "✅ node_modules directory found!\n";
    $count = count(scandir('node_modules')) - 2; // subtract . and ..
    echo "Contains approximately $count packages.\n";
} else {
    echo "❌ node_modules directory NOT found!\n";
}

echo "</pre>";
echo "<p><a href='/'>Back to site</a></p>";
?>