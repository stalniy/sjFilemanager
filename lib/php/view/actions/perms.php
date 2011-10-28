<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
?><?php $view->strip() ?>
<div style="padding:4px;" class="span-table">
<form class="sjs_form" action="" method="post">
    <input name="path" type="hidden" value="<?php echo isset($_REQUEST['file']) ? $_REQUEST['file'] : '' ?>">
    <span class="perms_fieldset label">
        <span><?php echo $lang['OWNER'] ?></span>
        <label for="owner_r">
        	<input type="checkbox" value="400" name="perms[own_read]" id="owner_r"  /> <?php echo $lang['READ'] ?>
        </label>
        <label for="owner_w">
        	<input type="checkbox" value="200" name="perms[own_write]" id="owner_w" /> <?php echo $lang['WRITE'] ?>
        </label>
        <label for="owner_e">
        	<input type="checkbox" value="100" name="perms[own_exec]" id="owner_e" /> <?php echo $lang['EXEC'] ?>
        </label>
    </span
    ><span class="perms_fieldset label">
        <span><?php echo $lang['GROUP'] ?></span>
        <label for="group_r">
        	<input type="checkbox" value="40" name="perms[gr_read]" id="group_r" /> <?php echo $lang['READ'] ?>
        </label>
        <label for="group_w">
        	<input type="checkbox" value="20" name="perms[gr_write]" id="group_w" /> <?php echo $lang['WRITE'] ?>
        </label>
        <label for="group_e">
        	<input type="checkbox" value="10" name="perms[gr_exec]" id="group_e" /> <?php echo $lang['EXEC'] ?>
        </label>
    </span
    ><span class="perms_fieldset label">
        <span><?php echo $lang['OTHER'] ?></span>
        <label for="other_r">
        	<input type="checkbox" value="4" name="perms[oth_read]" id="other_r" /> <?php echo $lang['READ'] ?>
        </label>
        <label for="other_w">
        	<input type="checkbox" value="2" name="perms[oth_write]" id="other_w" /> <?php echo $lang['WRITE'] ?>
        </label>
        <label for="other_e">
        	<input type="checkbox" value="1" name="perms[oth_exec]" id="other_e" /> <?php echo $lang['EXEC'] ?>
        </label>
    </span>
    <div class="perms_btn">
        <input class="input" type="text" value="<?php echo isset($perms_value) ? $perms_value : 0 ?>" name="perms[value]" maxlength="3" size="4" />
        <div align="right"><?php
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
        ?></div>
    </div>
</form>
</div>
<?php $view->strip_end() ?>
