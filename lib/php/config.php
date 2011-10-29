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

$_SYSTEM['tmpl_params'] = array();

$sjConfig = array(
    'lang'     => 'ru',
    // allowed actions
#    'allowed_actions' => array(),
    'charset'  => 'utf-8',
    'base_dir' => dirname(dirname(dirname(__FILE__))),
    'root'     => rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/uploads/sjFilemanager',
    'uploader' => array(
        'allowed_types' => array('jpeg','jpg','rar','png','doc','docx','ppt','pptx','xls','xlsx','mdb','accdb', 'swf', 'zip', 'rtf', 'pdf', 'psd', 'mp3', 'wma', 'flv', 'mp4'),
        'dynamic_name'  => true,
        'override'      => false,
        'images'        => array(
            'width' => 500,
            'height'=> 500,
            'type'  => 'width', // width, height, auto, percentage
            'crop'  => 'left-top' # left-top, left-bottom, center, right-top, right-bottom, custom array('x' => 100, 'y' => 200)
        ),
        'thumbs'        => array(
            /*'tmb_' => array(
                'width' => 125,
                'height'=> 70,
                'type'  => 'width',
                'crop'  => 'left-top'
            ),
            'mcr_' => array(
                'width' => 50,
                'height'=> 50,
                'type'  => 'width',
                'crop'  => 'left-top'
            )
            */
        )
    )
);

$max_size = ini_get('post_max_size');
$unit = strtoupper(substr($max_size, -1));
$multiplier = ($unit == 'M' ? 1048576 : ($unit == 'K' ? 1024 : ($unit == 'G' ? 1073741824 : 1)));

$sjConfig['uploader']['max_size'] = 500 * 1024; #$multiplier * (float)$max_size;
$sjConfig['lib_dir']  = $sjConfig['base_dir'] . '/lib/php';
