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

$path   = trim($_REQUEST['path']);
$action = $_REQUEST['action'];
$base_work_space = $sjConfig['root'];
$path   = $base_work_space . $path;
$path   = rtrim($path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

try {
    if (!pathIn($path, $base_work_space)
        || isset($sjConfig['allowed_actions'])
        && !in_array($action, $sjConfig['allowed_actions'])
    ) {
        throw new sjException($_SYSTEM['i18n']->__('Access denied'));
    }

    $fs = new iFilesystem();
    $fm = iFilemanager::create()
        ->setFilesystem($fs->setI18n($_SYSTEM['i18n']))
        ->setI18n($_SYSTEM['i18n']);

    $files = array();
    $has_files = isset($_REQUEST['files']) && is_array($_REQUEST['files']);

    if ($has_files) {
        $files = $_REQUEST['files']; // name of files

        if (isset($_REQUEST['baseDir'])) {
            $base_dir =  trim($_REQUEST['baseDir']); // in the the path have symbol '/'
            $base_dir = $base_work_space . $base_dir;
            if (!pathIn($base_dir, $base_work_space)) {
                throw new sjException($_SYSTEM['i18n']->__('Access denied'));
            }
        } else {
            $base_dir = $path;
        }

        foreach ($files as &$file) {
            $file = $base_dir . $file;
        }

        $fm->import($files);
    }
    switch($action){
        case 'paste':
            if (!$has_files) {
                throw new sjException($_SYSTEM['i18n']->__('Unable to process request'));
            }

            $fm->paste($path, array(
                'dynamic_name' => true,
                'move'         => isset($_REQUEST['onlyCopy']) && !$_REQUEST['onlyCopy']
            ));
        break;
        case 'remove':
            if (!$has_files) {
                throw new sjException($_SYSTEM['i18n']->__('Unable to process request'));
            }

            $fm->removeAll();
        break;
        case 'download':
            if (!$has_files) {
                $fm->import($path);
            }

            $fm->send('files.zip');
            $_SYSTEM['jsRequest']->reset();
        break;
        case 'perms':
            if (!$has_files) {
                throw new sjException($_SYSTEM['i18n']->__('Unable to process request'));
            }

            if (isset($_REQUEST['fileperms'])) {
                $fileperms = trim($_REQUEST['fileperms']);
            } else {
                $fileperms = false;
                $_SYSTEM['tmpl'] = 'actions/perms';
            }

            if (!$fileperms && $fm->count() == 1) {
                $mode = (int)$fs->getMode(reset($files));
                $_SYSTEM['tmpl_params']['perms_value'] = $mode;
            } elseif (is_numeric($fileperms)) {
                if (strlen($fileperms) < 3) {
                    while (strlen($fileperms) != 3) $fileperms .= '0';
                }
                $fileperms = substr($fileperms, 0, 3);
                $fs->chmod($files, eval("return(0{$fileperms});"));
            }
        break;
        case 'dir_info':
            $filename = $path;
            if ($has_files) {
                $filename = reset($files);
            }
            $stat = $fs->stat($filename);
            $stat['size'] = $fs->formatSize($filename);

            $_SYSTEM['tmpl_params']['property'] = array_slice($stat, 0);
            $_SYSTEM['tmpl'] = 'actions/property';
        break;
        case 'create_dir':
            if (!isset($_REQUEST['dirname']) || !$_REQUEST['dirname']) {
                throw new sjException($_SYSTEM['i18n']->__('Unable to process request'));
            }

            $dirname = trim($_REQUEST['dirname']);

            if (preg_match('/[\/:*?<>|\'"]+/', $dirname)) {
                throw new sjException($_SYSTEM['i18n']->__('File name can not contains following symmbols: \/:*?<>|"\''));
            }

            if (is_dir($path . $dirname)) {
                throw new sjException($_SYSTEM['i18n']->__('Unable to create folder. Folder with this name already exists'));
            }

            if (!$fs->mkdirs($path . $dirname)) {
                throw new sjException($_SYSTEM['i18n']->__('Unable to create folder. Permissions denied'));
            }
        break;
        case 'rename':
            if (!$has_files || !isset($_REQUEST['fileNames']) || empty($_REQUEST['fileNames'])) {
                throw new sjException($_SYSTEM['i18n']->__('Unable to process request'));
            }

            $newFileName = $fs->prepareFilename(reset($_REQUEST['fileNames']));
            $newFileExt  = $fs->getPathInfo($newFileName, PATHINFO_EXTENSION);
            if (!empty($sjConfig['uploader']['allowed_types'])
                && !in_array($newFileExt, $sjConfig['uploader']['allowed_types'])
            ) {
                throw new sjException($_SYSTEM['i18n']->__('Files with extension "%s" does not allowed', $newFileExt));
            }

            $oldFile = reset($files);
            $dirname = dirname($oldFile);
            $fs->rename($oldFile, $dirname . DIRECTORY_SEPARATOR . $newFileName);
        break;
        case 'upload':
            if (empty($_FILES)) {
                throw new sjException($_SYSTEM['i18n']->__('Unable to process request'));
            }

            $fm->import($_FILES)
                ->paste($path, $sjConfig['uploader']);
        break;
    }

    $_RESULT['response']['status'] = 'correct';
    $_RESULT['response']['msg'] = $_SYSTEM['lang']['REQUEST_DONE'];
} catch (sjException $e) {
    $_RESULT['response']['status'] = 'error';
    $_RESULT['response']['msg']    = $e->getMessage();

    // for flash SWFUpload
    if (isset($_REQUEST['print_error']) && $_REQUEST['print_error']) {
        echo $_RESULT['response']['msg'];
    }
}

if (isset($_SYSTEM['tmpl'])) {
    $view = new iView($_SYSTEM['tmpl']);
    $view->render(array_merge(
        $_SYSTEM['tmpl_params'],
        array('lang' => $_SYSTEM['lang'])
    ));
}
?>
