<?php
$dir = dirname(__FILE__);
$fixtures = $dir . '/../fixtures';
$files = array();

require $dir . '/../../lib/php/model/sfFilesystem.class.php';
require $dir . '/../../lib/php/model/iFilemanager.class.php';
require $dir . '/../../lib/php/model/image.class.php';

$fs = new iFilesystem();

logSection($fs->formatSize($fixtures), '->formatSize("'.realpath($fixtures).'")');

$file = $fixtures . '/test_file_';
$fs->touch($file);
logSection(file_exists($file), 'file touched', 'create');
$files[] = $file;

$fs->chmod($file, 0777);
logSection($fs->getMode($file) == '777', 'change mode to 0777', 'create');

$fileName = 'this is "bad :file|';
$newFileName = $fs->prepareFilename($fileName);
logSection($fileName, 'change filename to "' . $newFileName . '"');

$dir = $fs->readDir($fixtures);
$count = count($dir);
logSection($count, '(not recursive) number of items in fixtures dir = ' . $count);

$dir = $fs->readDir($fixtures, 'r');
$count = count($dir);
logSection($count, '(recursive) number of items in fixtures dir = ' . $count);

$dir = $fs->readDir($fixtures, 'r', array('flags' => 0));
$count = count($dir);
logSection($count, '(recursive) number of files in fixtures dir = ' . $count);

$dir = $fs->readDir($fixtures, 'r', array('skip' => '/jpe?g$/i'));
$count = count($dir);
logSection($count, '(skip jpeg) number of items in fixtures dir = ' . $count);

$result = $fs->stat($file);
logSection(is_array($result), 'stat for file "' . basename($file) . '"');

$result = $fs->dynamicFileName($file);
logSection(basename($file), sprintf('dynamic file name "%s"', basename($result)));

$file = $fixtures . '/test_file_(3)';
$fs->touch($file);
$result = $fs->dynamicFileName($file);
logSection(basename($file), sprintf('dynamic file name "%s"', basename($result)));
$files[] = $file;

$fs->mirror($fixtures, $fixtures . '/mirror', array(
    'image' => array(
        'width'  => 300,
        'height' => 300,
        'type'   => 'width',
        'crop'   => 'left-top'
    )
));
logSection(is_dir($fixtures . '/mirror'), 'mirror fixtures directory');

echo "remove created dir? (yes/no)\n";
$result = fgets(STDIN);
$result = trim($result);
if (is_dir($fixtures . '/mirror') && $result == 'yes') {
    $fs->remove($fs->readDir($fixtures . '/mirror', 'r', array('sort' => true)));
}

$pathinfo = '/бла/путь/к/файлу.бах';
logSection(true, 'Check path info for utf8 characters');
foreach ($fs->getPathInfo($pathinfo) as $k => $part) {
    logSection($k, $part);
}

removeCreated($files);
