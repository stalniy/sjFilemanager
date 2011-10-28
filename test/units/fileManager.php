<?php
$dir = dirname(__FILE__);
$fixtures = $dir . '/../fixtures';

require $dir . '/../../lib/php/model/sfFilesystem.class.php';
require $dir . '/../../lib/php/model/iFilemanager.class.php';
require $dir . '/../../lib/php/model/image.class.php';

$fs = new iFilesystem();
$fm = iFilemanager::create()
    ->setFilesystem($fs);

$fs->mkdirs($fixtures . '/filemanager');
$files = $fs->readDir($fixtures . '/image', 'r');

$fm->import($files)
    ->paste($fixtures . '/filemanager', array(
        'override' => true,
        'chmod' => 0644,
        'image' => array(
            'width' => 300,
            'height' => 200,
            'type'   => 'height',
            'crop'   => 'left-top'
        ),
        'thumbs' => array(
            'tmb_' => array(
                'width' => 100,
                'height' => 100,
                'type'   => 'height',
                'crop'   => 'left-top'
            )
        )
    ))
    ->clear();
logSection(is_dir($fixtures . '/filemanager'), 'paste all files from fixtures to fixtures/filemanager, make thumbs for images');

$fm->import($fs->readDir($fixtures . '/filemanager', 'r'))
    ->compress($fixtures . '/filemanager/copressed.zip');
logSection(is_file($fixtures . '/filemanager/copressed.zip'), 'Compress dir fixtures/filemanger');

echo "remove created files? (yes/no)\n";
$result = fgets(STDIN);
$result = trim($result);
if (is_dir($fixtures . '/filemanager') && $result == 'yes') {
    $fm->exec(array($fs, 'remove'));
    logSection(!is_file($fixtures . '/filemanager/copressed.zip'), 'remove files through exec method');
}
