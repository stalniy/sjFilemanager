<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Config file
 *
 * @var $sjConfig array
 */
define('SJ_IS_ADMIN', true);
function pathIn($path, $base) {
    $check = str_replace($base, '' ,$path);
    return file_exists($base . $check);
}

if (!function_exists('json_decode')) {
    throw new RuntimeException("PHP JSON module should be installed. Function json_decode does not exist");
}

function prepareConfig($file) {
    $max_size = ini_get('post_max_size');
    $unit = strtoupper(substr($max_size, -1));
    $multiplier = ($unit == 'M' ? 1048576 : ($unit == 'K' ? 1024 : ($unit == 'G' ? 1073741824 : 1)));

    $constants = array(
        '%BASE_DIR%'      => dirname(dirname(dirname(__FILE__))),
        '%DOCUMENT_ROOT%' => rtrim($_SERVER['DOCUMENT_ROOT'], '/'),
        '%POST_MAX_SIZE%' => $multiplier * (float)$max_size
    );

    $file = dirname(__FILE__) . '/' . $file;
    if (!is_readable($file)) {
        throw new RuntimeException("Configuration file is missed. 'config.json' should be available for reading in the lib directory");
    }

    $config = file_get_contents($file);
    $config = preg_replace('!^\s*(?://|#).++\s!m', '', $config);
    $config = strtr($config, $constants);
    return $config;
}
$sjConfig = json_decode(prepareConfig('../../web/config.json'), true);
if (!$sjConfig) {
    throw new RuntimeException("Invalid configuration file: " . json_last_error());
}
