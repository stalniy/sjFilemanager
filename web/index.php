<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Main controller file.
 * This file response for all request
 */

require dirname(__FILE__) . '/../lib/php/config.php';
require $sjConfig['lib_dir'] . '/model/sfFilesystem.class.php';
require $sjConfig['lib_dir'] . '/model/iFilemanager.class.php';
require $sjConfig['lib_dir'] . '/lang/lang_' . $sjConfig['lang'] . '.php';

$_SYSTEM['i18n']    = new sjI18n($_SYSTEM['lang']);
$_SYSTEM['is_ajax'] = isset($_REQUEST['_JsRequest']) && strpos($_REQUEST['_JsRequest'], '-') !== false;
if ($_SYSTEM['is_ajax']) {
    include $sjConfig['lib_dir']. '/model/JsHttpRequest.php';

    $_SYSTEM['jsRequest'] = new JsHttpRequest($sjConfig['charset']);
    $GLOBALS['_RESULT'] = array();
    $_RESULT = &$GLOBALS['_RESULT'];
}


$action = isset($_REQUEST['action']) ? trim($_REQUEST['action']) : null;
$_REQUEST['action']  = $action;

try {
    $_SYSTEM['i18n']->setHiddenStrings(array(
        dirname(__FILE__) => '*base*',
        $sjConfig['root'] => '*root*'
    ));
    if (!empty($_REQUEST['manager_type']) && $_REQUEST['manager_type'] == 'media') {
        include $sjConfig['lib_dir'] . '/ctrl/mm-action.php';
    } elseif ($action) {
        include $sjConfig['lib_dir'] . '/ctrl/fm-action.php';
    } else {
        include $sjConfig['lib_dir'] . '/ctrl/fm-dir-read.php';
    }
} catch (Exception $e) {
    echo $e->getMessage();
}
?>
