<?php
$test = $_SERVER['argv'][1];
$dir  = dirname(__FILE__);

function logSection($str, $comment = '', $section = 'info'){
    if ($str === true) {
        $str = 'true';
    } elseif ($str === false) {
        $str = 'false';
    }

    if ($comment) {
        $comment = " \t - " . $comment;
    }
    
    if ($section) {
        $section .= "\t";
    }

    echo $section, ">>\t", $str, $comment, "\n";
}

function removeCreated(array $files) {
    echo "Remove all created files? (yes/no)\n";
    $result = fgets(STDIN);
    $result = strtolower(trim($result));
    if ($result == 'yes' || $result == 'y') {
        foreach ($files as $file) {
            file_exists($file) && unlink($file);
        }
    }
}

$testFile = $dir . '/units/' . $test . '.php';
if (!file_exists($testFile)) {
    throw new Exception(sprintf('Test "%s" does not exists', $test));
}

require $testFile;
