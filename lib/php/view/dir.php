<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
?><?php $view->strip() ?>
<table class="sjs_table filelist">
    <thead>
        <tr class="head">
            <th class="tcenter width40 padding-left-0">&nbsp;</th>
            <th class="list-current"><a href="#" class="sort by-name"><?php echo $lang['FILENAME'] ?></a></th>
            <th class="width70"><a href="#" class="sort by-type"><?php echo $lang['TYPE'] ?></a></th>
            <th><a href="#" class="sort by-size"><?php echo $lang['SIZE'] ?></a></th>
            <th class="width110"><a href="#" class="sort by-modify"><?php echo $lang['MODIFY'] ?></a></th>
        </tr>
    </thead>
<tbody class="<?php echo $cur_dir ?>/">
    <?php if ($cur_dir): ?>
    <tr class="parent-dir">
        <td class="tcenter padding-left-0 width40">&nbsp;</td>
        <td class="dir list-current"><label class="parent-dir folder">..</label></td>
        <td class="width70">&nbsp;</td>
        <td><?php echo $lang['PARENT'] ?></td>
        <td class="width110">&nbsp;</td>
    </tr>
    <?php endif ?>
    <?php if (!empty($source)): ?>
    <?php foreach ($source as &$info): ?>
    <tr>
        <td class="tcenter padding-left-0 width40"><input type="checkbox" name="files[]" value="<?php echo $info['basename'] ?>" /></td>
        <?php if (is_dir($info['path'])): ?>
        <td class="dir list-current"><label class="folder"><?php echo $info['name'] ?></label></td>
        <td class="width70"><?php echo $lang['DIR'] ?></td>
        <?php else: ?>
        <td class="file list-current"><label class="default <?php echo strtolower($info['type']) ?>"><?php echo $info['name'] ?></label></td>
        <td class="width70"><?php echo strtolower($info['type']) ?></td>
        <?php endif ?>
        <td><?php echo $info['size'] ?></td>
        <td class="width110"><?php echo $info['modify'] ?></td>
    </tr>
    <?php endforeach ?>
    <?php elseif (!$cur_dir): ?>
    <tr><td colspan="5" align="center"><?php echo $lang['EMPTY_DIR'] ?></td></tr>
    <?php endif ?>
    </tbody>
</table>
<?php $view->strip_end() ?>
