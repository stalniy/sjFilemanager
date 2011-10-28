<?php
$dir = dirname(__FILE__);
$fixtures = $dir . '/../fixtures/image';
require $dir . '/../../lib/php/model/image.class.php';

$baseImage = $fixtures . '/FordMustang.jpg';
$waterMark = $fixtures . '/black-opacity.png';
$image = new image($baseImage);
$images = array();

logSection($image->isActive(), 'is valid image', 'info');
if (!$image->isActive()){
    logSection('exit', 'image is invalid, operation can not be finished', 'error');
}
$width = $image->getData('width');
$height= $image->getData('height');
logSection($width . 'x' . $height, 'test getData method', 'info');
logSection('jpeg' == $image->getType(), 'test getType method', 'info');

$image->resize(500, 500, 'height');
$image->save($fixtures . '/FordMustang-500h.jpg');
$images[] = $fixtures . '/FordMustang-500h.jpg';

logSection(file_exists($fixtures . '/FordMustang-500h.jpg'), '->resize(500, 500, height)->save(FordMustang-500h.jpg)');
logSection($image->getData('height') == 500, 'height == 500');

$image->resize(500, 500, 'width');
$image->save($fixtures . '/FordMustang-500w.jpg');
$images[] = $fixtures . '/FordMustang-500w.jpg';

logSection(file_exists($fixtures . '/FordMustang-500w.jpg'), '->resize(500, 500, width)->save(FordMustang-500w.jpg)');
logSection($image->getData('width') == 500, 'width == 500');

$image->resize(500, 500, 'auto');
$image->save($fixtures . '/FordMustang-500a.jpg');
$images[] = $fixtures . '/FordMustang-500a.jpg';

logSection(file_exists($fixtures . '/FordMustang-500w.jpg'), '->resize(500, 500, auto)->save(FordMustang-500a.jpg)');
logSection($image->getData('width') == 500, 'width == 500');

$image->resize(2, 0, 'zoom');
$image->save($fixtures . '/FordMustang-2z.jpg');
$images[] = $fixtures . '/FordMustang-2z.jpg';

logSection(file_exists($fixtures . '/FordMustang-2z.jpg'), '->resize(2, 0, zoom)->save(FordMustang-2z.jpg)');
logSection($image->getData('width') == 1000, 'width == 1000');

$image->resize(250, 300, 'crop', array('type' => 'left-top'));
$image->save($fixtures . '/FordMustang-250x300crop.jpg');
$images[] = $fixtures . '/FordMustang-250x300crop.jpg';

logSection(file_exists($fixtures . '/FordMustang-250x300crop.jpg'), '->resize(250, 300, crop)->save(FordMustang-250x300crop.jpg)');
logSection($image->getData('width') == 250 && $image->getData('height') == 300, 'width == 250 and height == 300; crop left-top');


$image->resize(50, 250, 'crop', array('x' => 200, 'y' => 50));
$image->save($fixtures . '/FordMustang-50x250crop.custom200x50.jpg');
$images[] = $fixtures . '/FordMustang-50x250crop.custom200x50.jpg';

logSection(file_exists($fixtures . '/FordMustang-50x250crop.custom200x50.jpg'), '->resize(50, 250, crop, array(x => 200, y => 50))->save(FordMustang-50x250crop.custom200x50.jpg)');
logSection($image->getData('width') == 50 && $image->getData('height') == 250, 'width == 50 and height == 250; crop custom');

$image->close();
logSection(true, 'close image');

$image = new image($baseImage);
$image->override = false;
$image->save($baseImage);
$images[] = $image->getSavedName();
logSection(basename($image->getSavedName()), 'saved name');
logSection(strpos($image->getSavedName(), '(') !== false, 'saved name contains "("');

$file = $fixtures . '/FordMustang.cornersr50.jpg';
$image->corners(50, 10, array(250,50,100,0))
    ->save($file);
$images[] = $file;
logSection(file_exists($file), 'is file created with corners R=50', 'corners');

$file = $fixtures . '/FordMustang.waterMark.jpg';
$image->mark($waterMark, array(
    'x' => 500,
    'y' =>  500
))->save($file);
$images[] = $file;
logSection(file_exists($file), 'is created file exists', 'mark');

$data = $image->getPathInfo('/тестовый/путь/к.jpg');
logSection(is_array($data), 'is array result', 'pathinfo');
foreach($data as $k => &$part) {
    logSection($part, '"' . $k .'"', 'pathinfo');
}

@mkdir($fixtures . '/mcr', 0777);
$thumbs = $image->createThumbs($fixtures . '/FordMustang.jpg', array(
    'mcr/' => array(
        'width'  => 50,
        'height' => 50,
        'type'   => 'width',
        'crop'   => 'left-top'
    ),
    'thumb_' => array(
        'width'  => 100,
        'height' => 100,
        'type'   => 'height',
        'crop'   => 'left-top'
    )
));

$images = array_merge($thumbs, $images);

foreach ($thumbs as $tmb) {
    logSection(file_exists($tmb), 'is file exists', 'thumbs');
}

try {
    $file = $fixtures . '/FordMustang.rotate90.jpg';
    $oldWidth  = $image->getData('width');
    $oldHeight = $image->getData('height');
    $image->rotate(90)
        ->save($file);

    logSection($oldWidth == $image->getData('height') && $oldHeight == $image->getData('width'), 'is rotated', 'rotate');
    $images[] = $file;
} catch(Exception $e) {
    logSection(false, $e->getMessage(), 'error');
}

$file = $fixtures . '/FordMustang.polygonMask.jpg';
$w = $image->getData('width');
$h = $image->getData('height');
$image->mask('polygon', array(
    0, 100,
    100, 0,
    $w - 100, 0,
    $w, 100,
    $w, $h - 100,
    $w - 100, $h,
    100, $h,
    0, $h - 100
), 100, array(0, 255, 0))->save($file);
$images[] = $image->getSavedName();
logSection(file_exists($file), 'image was masked with #0f0 color');

removeCreated($images);
