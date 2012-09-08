<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
?><?php $view->strip() ?>
<div id="sjWrapper">
    <form class="sjs_form" name="sjs_form" action="" method="post" enctype="multipart/form-data">
        <div class="filemanagertop" id="sjFmActions" title="<?php echo $cur_dir ?>">
            <span class="loading somedo"></span>
            <?php foreach ($file_actions as $item) :?>
            <a href="#" class="sjfm_files_<?php echo $item[0], ' ', $item[1]?>" title="<?php echo $item[2]?>" name="<?php echo $item[0]?>">&nbsp;</a>
            <?php endforeach ?>
        </div>
        <div id="sjFilemanager"><?php
            $view->display('dir', array(
                'source' => $source,
                'lang'   => $lang,
                'cur_dir'=> $cur_dir
            ))
        ?></div>
    </form>
</div>
<!-- TMPL FOR JS WINDOWS -->
<div id="sjConfirmTmpl" class="hide"><form class="sjs_form" action="">
    <div style="padding:2px;">
        <div class="label window_warning"><?php echo $lang['CNFR_REMOVE'] ?></div>
        <div class="field" align="right" style="margin-right:50px;">
        <?php
            $view->display('button', array(
                'type'  => 'button',
                'label' => $lang['OK'],
                'btn_name' => 'ok'
            ));
            $view->display('button', array(
                'type'  => 'button',
                'label' => $lang['CANCEL'],
                'btn_name'  => 'cancel',
                'btn_value' => 'cancel'
            ));
        ?>
        </div>
    </div>
</form></div>
<div id="sjUploadTmpl" class="hidden">
    <div class="upload-form sjs_form">
        <div class="fieldset flash label" id="sjFmUploadProgress">
            <span class="legend"><?php echo $lang['UPLOAD_FILES'] ?></span>
        </div>
        <div id="divMovieContainer" style="margin:5px 10px">
            <span id="sjFmButtonPlaceHolder"></span>
            <?php $view->display('button', array(
                'type'  => 'button',
                'label' => $lang['START_UPLOAD'],
                'btn_name' => 'upload'
            )) ?>
        </div>
    </div>
</div>
<?php $view->strip_end() ?>
