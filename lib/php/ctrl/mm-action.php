<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
if (!defined('SJ_IS_ADMIN')) {
    header('Location: http://www.google.com');
    exit;
}

$files = isset($_REQUEST['files']) ? $_REQUEST['files'] : array();
if (!is_array($files)) {
    $files = array($files);
}

$rootPath = rtrim($_SERVER['DOCUMENT_ROOT'], DIRECTORY_SEPARATOR);
$fs = new iFilesystem();
$fs->setI18n($_SYSTEM['i18n']);

// %Begin Validate $dirpath
foreach ($files as $filePath => $newName) {
    $pathinfo = $fs->getPathInfo($filePath);
    $dirpath  = ltrim($pathinfo['dirname'], '/');

    $dirpath  = $dirpath ? str_replace('\\', DIRECTORY_SEPARATOR, $dirpath) : '';
    $realpath = realpath($rootPath . DIRECTORY_SEPARATOR . $dirpath);

    $rootLength = strlen($sjConfig['root']);
    $realLength = strlen($realpath);

    if(!$realpath || $realLength < $rootLength){ // hack attemt
        $realpath  = $sjConfig['root'];
        unset($files[$i]);
    }
}
// %End validate $dirpath
require $sjConfig['lib_dir'] . '/model/image.class.php';
$_RESULT['media'] = array();

$width  = $_REQUEST['width'];
$height = $_REQUEST['height'];
$left   = $_REQUEST['left'];
$top    = $_REQUEST['top'];

$overrideOld = !empty($_REQUEST['override']);
$action      = $_REQUEST['action'];

try {
    foreach ($files as $imagePath => $newName) {
        $file  = $rootPath . $imagePath;
        $image = $fs->createImage($file, $overrideOld);
        $pathinfo = $fs->getPathInfo($file);

        switch ($action) {
            case 'resize':
                $image->resize($width, $height);
                break;
            case 'crop':
                $image->resize($width, $height, 'crop', array(
                    'x' => $left,
                    'y' => $top
                ));
                break;
        }

        $image->save($pathinfo['dirname'] . '/' . $newName, 80);
        $_RESULT['media']['add'][] = str_replace($rootPath, '', $image->getSavedName());
        if ($overrideOld) {
            $_RESULT['media']['rm'][]  = $imagePath;
        }
    }
    $_RESULT['response']['status'] = 'success';
} catch (Exception $e) {
	$_RESULT['response']['status'] = 'error';
    $_RESULT['response']['msg']    = $fs->getI18n()->__($e->getMessage());
}
?>
