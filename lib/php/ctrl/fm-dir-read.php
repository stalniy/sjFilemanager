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
    $fs = new iFilesystem();
    $result = $fs->setI18n($_SYSTEM['i18n'])
        ->readDir($realpath, '!r', array( // not recursive
            'sort' => true
        ));

    $data = array();
    foreach ($result as &$file) {
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
            'path'  => $file,
            'size'  => $is_dir ? '' : $fs->formatSize($file) . 'b',
            'modify'=> $fs->formatDate(filemtime($file)),
            'type'  => $extension,
            'is_dir'=> $is_dir
        );
    }

    $show_actions = isset($_REQUEST['show_actions']) && $_REQUEST['show_actions'];
    if (!$_SYSTEM['is_ajax'] || $show_actions) {
        $file_actions = array(
            array('refresh',  '',                         $_SYSTEM['lang']['REFRESH']),
            array('cut',     'onlyFile sjsFMdinamic',     $_SYSTEM['lang']['CUT']),
            array('copy',    'onlyFile sjsFMdinamic',     $_SYSTEM['lang']['COPY']),
            array('remove',  'sjsFMdinamic',              $_SYSTEM['lang']['REMOVE']),
            array('paste',   'sjsFMdisabled sjsFMdinamic',$_SYSTEM['lang']['PASTE']),
            array('rename',  'sjsFMdinamic',              $_SYSTEM['lang']['RENAME']),
            array('perms',   'sjsFMdinamic',              $_SYSTEM['lang']['PERMS']),
            array('createDir', '',                        $_SYSTEM['lang']['CREATE_DIR']),
            array('upload',    '',                        $_SYSTEM['lang']['UPLOAD']),
            array('download',  'sjsFMdisable',            $_SYSTEM['lang']['DOWNLOAD']),
            array('dirInfo',   '',                        $_SYSTEM['lang']['DIR_INFO']),
            array('transform', 'active',                  $_SYSTEM['lang']['TRANSFORM'])
        );
        ksort($file_actions);
        if (isset($sjConfig['allowed_actions'])) {
            foreach ($file_actions as $k => &$action) {
                if (!in_array($action[0], $sjConfig['allowed_actions'])) {
                    unset($file_actions[$k]);
                }
            }
        }
    } else {
        $file_actions = null;
    }

    $tmpl = !empty($_SYSTEM['template']) ? $_SYSTEM['template'] : '';
    if (!$tmpl) {
        $tmpl = $_SYSTEM['is_ajax'] ? 'dir' : 'index';
    }

    $view = new iView($tmpl);

    $view->setI18n($_SYSTEM['i18n'])->render(array(
        'file_actions' => $file_actions,
        'cur_dir'      => $cur_dir,
        'source'       => $data,
        'lang'         => $_SYSTEM['lang'],
        'base_host'    => 'http://' . $_SERVER['HTTP_HOST']
    ));
} catch (sjException $e) {
    if ($_SYSTEM['is_ajax']) {
        $_RESULT['response']['status'] = 'error';
        $_RESULT['response']['msg']    = $e->getMessage();
    } else {
        throw $e;
    }
}
