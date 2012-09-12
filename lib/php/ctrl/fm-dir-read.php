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

// %Begin Validate $dirpath
$dirpath  = isset($_REQUEST['dirpath']) ? str_replace('\\', DIRECTORY_SEPARATOR, $_REQUEST['dirpath']) : '';
$dirpath  = urldecode($dirpath);
$realpath = realpath($sjConfig['root'] . DIRECTORY_SEPARATOR . $dirpath);

$realLength = strlen($realpath);
$rootLength = strlen($sjConfig['root']);

$cur_dir = substr($realpath, $rootLength);

if(!$realpath || $realLength < $rootLength){ // hack attemt
	$realpath = $sjConfig['root'];
	$cur_dir  =  '';
}
// %End validate $dirpath

try {
    $page   = 1;
    $limit  = $sjConfig['max_files_per_page'];
    $offset = 0;

    if (!empty($_REQUEST['page']) && is_numeric($_REQUEST['page']) && $_REQUEST['page'] > 1) {
        $page = (int)$_REQUEST['page'];
        $offset = ($page - 1) * $limit + 1;
    }

    $fs = new iFilesystem();
    $result = $fs->setI18n($_SYSTEM['i18n'])
        ->readDir($realpath, '!r', array( // not recursive
            'sort'   => true,
            'offset' => $offset,
            'limit'  => $limit
        ));

    $data = array();
    foreach ($result as $file) {
        $info = $fs->getPathInfo($file);
        $is_dir = is_dir($file);
        if ($info['basename'][0] == '.') {
            $filename  = $info['basename'];
            $extension = '';
        } else {
            $filename  = $is_dir ? $info['basename'] : $info['filename'];
            $extension = !$is_dir && isset($info['extension']) ? $info['extension'] : '';
        }
        $data[] = array(
            'basename' => $info['basename'],
            'name'  => $filename,
            'size'  => $is_dir ? '' : $fs->formatSize($file) . 'b',
            'modify'=> $fs->formatDate(filemtime($file)),
            'type'  => $extension,
            'is_dir'=> $is_dir
        );
    }

    $_RESULT['files'] = array(
        'cur_dir' => $cur_dir ? $cur_dir : '',
        'source'  => $data
    );
} catch (sjException $e) {
    if ($_SYSTEM['is_ajax']) {
        $_RESULT['response']['status'] = 'error';
        $_RESULT['response']['msg']    = $e->getMessage();
    } else {
        throw $e;
    }
}
