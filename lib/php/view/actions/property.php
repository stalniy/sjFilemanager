<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
?><div style="padding:4px" class="span-table">
    <span class="no_bold label span-cell">
    <?php foreach ($lang['PROPERTY_OF_FILE'] as &$item): ?>
        <span><?php echo $item ?></span>
    <?php endforeach ?>
    </span>
    <span class="margin-left20 no_bold label span-cell">
    <?php foreach ($property as &$item):?>
        <span><?php echo $item ?></span>
    <?php endforeach ?>
    </span>
</div>
