<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Image class. Working with jpeg, gif, png.
 * Use gd2 php libriory.
 *
 * @package    iFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
class image {
    public
        $override = true;
    protected
        $data,
        $isActive = true,
        $isClosed = false,
        $savedName;
	protected static
        $allowImg = array('gif', 'png', 'jpeg', 'jpg');

    /**
     * Constructor
     *
     * @param string $path_to_img
     */
	public function __construct($path_to_img) {
        $this->data = self::getImageInfo($path_to_img);

        $this->isActive = (bool)$this->data;
	}

    /**
     * Destructor
     */
    public function __destruct() {
        $this->close();
    }

    /**
     * Get data about image
     *
     * @param string $name
     * @return mixed
     */
    public function getData($name) {
        return array_key_exists($name, $this->data) ? $this->data[$name] : null;
    }

    /**
     * Destroy image from memory
     *
     * @return image
     */
    public function close(){
        $this->isClosed = true;
        if (is_resource($this->data['img'])) {
            imagedestroy($this->data['img']);
        }
        return $this;
    }

    /**
     * Workaround method for restoring alpha transparency for gif images
     *
     * @param resource  $src
     * @param resource  $dest
     * @return resource       transparent gf color
     */
	public static function restoreGifAlphaColor(&$src, &$dest) {
		$transparentcolor = imagecolortransparent($src);

		if($transparentcolor != -1){
			$colorcount = imagecolorstotal($src);
			imagetruecolortopalette($dest, true, $colorcount);
			imagepalettecopy($dest, $src);
			imagefill($dest, 0, 0, $transparentcolor);
			imagecolortransparent($dest, $transparentcolor);
		}

		return $transparentcolor;
	}

    /**
     * Restore alpha transparency for png images
     *
     * @param resource $img
     * @return void
     */
	public static function restoreAlphaColor(&$img) {
        imagealphablending($img, false);
		imagesavealpha($img, true);
	}

    /**
     * Get information about image
     *
     * @param string $path_to_img
     * @return array|bool
     */
	protected static function getImageInfo($path_to_img) {
		$info = @getimagesize($path_to_img);

		if(!$info) {
            return false;
        }

		$info['width']  = $info[0];
		$info['height'] = $info[1];
		$info['src']    = $path_to_img;

		switch ($info[2]) {
			case 1: $info['img'] = imagecreatefromgif($path_to_img);  break;
			case 2: $info['img'] = imagecreatefromjpeg($path_to_img); break;
			case 3: $info['img'] = imagecreatefrompng($path_to_img);  break;
		}
		unset($info[0], $info[1], $info[2], $info[3]);

		return $info;
	}

    /**
     * Get image type
     *
     * @return string
     */
    public function getType() {
        return substr($this->data['mime'], 6);
    }

    /**
     * Set image type
     *
     * @return bool
     */
	public function setType($type) {
		if(!in_array($type, self::$allowImg)) {
            return false;
        }

		$mime = $this->data['mime'];
		$this->data['mime'] = 'image/'.$type;

		return true;
	}

    /**
     * Prepare image filename based on $this->override
     *
     * @param  string $filename
     * @return string
     */
    protected function prepareName($filename) {
        if ($this->override && file_exists($filename)) {
            if (!is_writable($filename)) {
                throw new Exception('Unable to override. File is not writable');
            }
            unlink($filename);
        } else {
            $info = $this->getPathInfo($filename);

            $i = 1;
            while (file_exists($filename)) {
                $filename = $info['dirname'] . DIRECTORY_SEPARATOR . $info['filename'] . '(' . $i++ . ').' . $info['extension'];
            }
        }

        return $filename;
    }

    /**
     * Save image
     *
     * @param string $name      if not specified then image will be ouputed to user agent
     * @param int    $quality
     * @param int    $chmod
     * @return string|bool    saved name or false
     */
	public function save($name = null, $quality = 65, $chmod = 0664){
        if ($this->isClosed) {
            return false;
        }

        $type = $this->getType();
		$save_fn = 'image' . $type;
        $name = trim($name);

        if (!function_exists($save_fn) || is_dir($name)) {
            return false;
        }

		if (empty($name)) {
			header('Content-type: '.$this->data['mime']);

			return $save_fn($this->data['img']);
		} else {
            $info = $this->getPathInfo($name);
            if (in_array($info['extension'], self::$allowImg)) {
                $type = $info['extension'];
            }

            if (!is_dir($info['dirname'])) {
                @mkdir($info['dirname'], true);
            }

            $name = $info['dirname'] . DIRECTORY_SEPARATOR . $info['filename'] . '.' . $type;
            $name = $this->prepareName($name);
            if ($type == 'png') {
                $quality /= 100;
                $quality = (int)$quality;
                if ($quality > 9) {
                    $quality = 9;
                }
            }
            $result = $save_fn($this->data['img'], $name, $quality);
        }

        if ($result) {
            $this->savedName = $name;
            @chmod($name, $chmod);
            return $this->savedName;
        } else {
            return false;
        }
	}

    /**
     * Get saved name
     *
     * @return string
     */
    public function getSavedName() {
        return $this->savedName;
    }

    /**
     * Make corners for image using specific mask
     *
     * @todo now it can create only elipsed corners
     *
     * @param int $radius
     * @param int $rate     rate of created corners
     * @param array $bg     corners background in RGBA if $bg[4] == 127 corners will be transparent
     * @return image
     */
	public function corners($radius = 50, $rate = 10, $bg = array(255, 255, 255, 127)){
		$type = $this->getType();

		if ($rate <= 0 || $radius <= 0 || !$type || count($bg) < 4) {
            return false;
        }
		if ($type == 'jpeg' || $type == 'gif') {
			$gif_alpha = $bg[3];
			$bg[3] = 0;
		}

		$dest   = &$this->data['img'];
		$tmp_r  = $rate * $radius;
		$size   = 2 * $tmp_r;
		$w = $this->data['width'];
		$h = $this->data['height'];

		self::restoreAlphaColor($this->data['img']);
		$corners = imagecreatetruecolor($size, $size);
		imagealphablending($corners, false);

		$alpha = imagecolorallocatealpha($corners, $bg[0], $bg[1], $bg[2], (int)$bg[3]);
		$points = array(
			array(0,0,0,0),//[0]&[1]=Adest(0,0) [2]&[3]=Asrc(0,0)
			array($tmp_r, 0, $w - $radius, 0),
			array($tmp_r, $tmp_r, $w - $radius, $h - $radius),
			array(0, $tmp_r, 0, $h - $radius)
		);
		$maskPoints = array(
			array(1, 1),
			array($size-1, $size-1),
			array($size-1, 1),
			array(1, $size-1)
		);

		foreach ($points as &$point) {
			imagecopyresampled($corners, $dest, $point[0], $point[1], $point[2], $point[3], $tmp_r, $tmp_r, $radius, $radius);
        }

		$info = array('width' => $size,'height' => $size,'img' => $corners);
		$this->mask('ellipse', array(
            'x'    => $tmp_r,
            'y'    => $tmp_r,
            'width'  => $size,
            'height' => $size
        ), 100, array(14, 255, 12), $info);
		unset($info);

		foreach ($maskPoints as &$point) {
            imagefill($corners, $point[0], $point[1], $alpha);
        }
        unset($maskPoints);

		foreach ($points as &$point) {
            imagecopyresampled($dest, $corners, $point[2], $point[3], $point[0], $point[1], $radius, $radius, $tmp_r, $tmp_r);
        }

		if($type == 'gif' && $gif_alpha == 127){
			$alpha = imagecolorat($dest, 0, 0);
			imagecolortransparent($dest, $alpha);
			imagesetthickness($dest, 2);

            $gifPoints = array(
                array($w - $radius + 1,$h - $radius + 1),
                array($radius - 1, $h - $radius + 1),
                array($radius - 1, $radius - 1),
                array($w - $radius + 1, $radius - 1)
            );

			foreach ($gifPoints as $angle => &$point) {
                imagearc($dest, $point[0], $point[1], 2 * $radius, 2 * $radius, 90 * $angle, ($angle + 1) * 90, $alpha);
            }
        }

		imagedestroy($corners);
		unset($dest);

		return $this;
	}

    /**
     * Resize mode
     *
     * @param int $x
     * @param int $y
     * @param string $mode     (auto, width, height, percentage, crop)
     * @param array  $options  for crop "type" (left-top, left-bottom, center, right-bottom, right-top, specific array('x' => int, 'y' => int))
     * @return array
     */
	protected function resizeMode(&$x, &$y, $mode = 'auto', array $options = null){
		$w = $this->data['width'];
		$h = $this->data['height'];

		if($mode == 'auto') {
            $mode = $w >= $h ? 'width' : 'height';
        }

        if (!isset($options['type'])) {
            $options['type'] = null;
        }

		switch($mode){
			case 'crop':
                if ($x > $w) $x = $w;
                if ($y > $h) $y = $h;

                switch ($options['type']) {
                    case 'left-top':
                        $_x = $_y = 0;
                    break;
                    case 'left-bottom':
                        $_x = 0;
                        $_y = $h - $y;
                    break;
                    case 'center':
                        $_x = floor(($w - $x) / 2);
                        $_y = floor(($h - $y) / 2);
                    break;
                    case 'right-top':
                        $_x = $w - $x;
                        $_y = 0;
                    break;
                    case 'right-bottom':
                        $_x = $w - $x;
                        $_y = $h - $y;
                    break;
                    default:
                        $_x = isset($options['x']) ? $options['x'] : 0;
                        $_y = isset($options['y']) ? $options['y'] : 0;
                    break;
                }

				return array($_x, $_y, $x, $y);
			break;
			case 'width':
				$n = $w / $h;
				$y = $x / $n;
			break;
			case 'height':
				$n = $h / $w;
				$x = $y / $n;
			break;
			default: // zoom
				$n = $w / $h;
				$x *= $w;
				$y = $x / $n;
			break;
		}

		return array(0, 0, $w, $h);
	}

    /**
     * Resize image
     *
     * @param int $x          width in px
     * @param int $y          height in px
     * @param string $mode    see resizeMode()
     * @param array  $options see resizeMode()
     * @return bool
     */
	public function resize($x, $y = 1, $mode = 'auto', array $options = array()) {
		if($x <= 0 || $y <= 0 && $mode != 'zoom') {
            return false;
        }

		$type = $this->getType();
		$w = $this->data['width'];
		$h = $this->data['height'];
		$pos = $this->resizeMode($x, $y, $mode, $options);

		$new = imagecreatetruecolor($x, $y);
        $this->saveAlpha($new);

		imagecopyresampled($new, $this->data['img'], 0, 0, $pos[0], $pos[1], $x, $y, $pos[2], $pos[3]);
        imagedestroy($this->data['img']);

		$this->data['width'] = $x;
		$this->data['height'] = $y;
		$this->data['img'] = $new;
		unset($new);

		return true;
	}

    /**
     * Mask image using one of the implemented mask methods
     *
     *
     * @param string $callable
     * @param array  $cfg        config for mask type function
     * @param int    $opacity    mask opacity
     * @param array  $bg         mask background
     * @param resource $apply_to image resource
     * @return bool|image
     */
	public function mask($callable, $cfg, $opacity = 100, array $bg = array(0, 0, 0), $apply_to = null) {
        if (is_string($callable) && method_exists($this, strtolower($callable) . 'Mask')) {
            $callable = array($this, strtolower($callable) . 'Mask');
        }elseif (!is_callable($callable)) {
            return false;
        }

		$info = is_null($apply_to) ? $this->data : $apply_to;
		unset($apply_to);

		$w = $info['width'];
		$h = $info['height'];
		$mask = imagecreatetruecolor($w, $h);
		$bg = imagecolorallocate($mask, $bg[0], $bg[1], $bg[2]);
		imagefill($mask, 0, 0, $bg);

		$alpha = imagecolorallocate($mask, 21, 243, 244);
		imagecolortransparent($mask, $alpha);
        if (call_user_func($callable, $mask, $alpha, $cfg, $this)) {
            imagecopymerge($info['img'], $mask, 0, 0, 0, 0, $w, $h, $opacity);
        }
        imagedestroy($mask);
		unset($info);

		return $this;
	}

    /**
     * Make image color transparent
     *
     * @param  array $color  RGB color
     * @return image
     */
    public function transparent(array $color) {
        $bg = imagecolorallocate($this->data['img'], $color[0], $color[1], $color[2]);
        imagecolortransparent($this->data['img'], $bg);
        return $this;
    }

    /**
     * Callaback for mask() method
     *
     * @param resource $mask   image resource mask
     * @param resource $alpha  color resource
     * @param array    $cfg    configs
     * @return void
     */
	protected function polygonMask(&$mask, &$alpha, array &$cfg) {
		if(!is_array($cfg)) {
			throw new Exception('Wrong configuration for image::' . __FUNCTION__);
        }

        $cfg = array_map('floatval', $cfg);
		$num_points = count($cfg) / 2;
		imagefilledpolygon($mask, $cfg, $num_points, $alpha);
        return true;
	}

    /**
     * Callaback for mask() method
     *
     * @throws Exception
     * @param resource $mask   image resource mask
     * @param resource $alpha  color resource
     * @param array    $cfg    configs
     * @return void
     */
	protected function ellipseMask(&$mask, &$alpha, array &$cfg) {
		if(!isset($cfg['x']) || !isset($cfg['y'])
           || !isset($cfg['width']) || !isset($cfg['height'])
        ) {
            throw new Exception('Wrong configuration for image::' . __FUNCTION__);
        }
		imagefilledellipse($mask, $cfg['x'], $cfg['y'], $cfg['width'], $cfg['height'], $alpha);
        return true;
	}

    /**
     * Rotate image
     *
     * @throws Exception
     * @param int $angle
     * @return image
     */
	public function rotate($angle, $bg = '') {
		$type = $this->getType();
        if (!function_exists('imagerotate')) {
            throw new Exception("Your PHP does not have functionality to rotate the image");
        }

		$rotate = imagerotate($this->data['img'], $angle, imagecolorallocatealpha($this->data['img'], 0, 0, 0, 127));
        $this->saveAlpha($rotate);

		imagedestroy($this->data['img']);

		$this->data['img']    = &$rotate;
		$this->data['width']  = imagesx($rotate);
		$this->data['height'] = imagesy($rotate);

        return $this;
	}

    /**
     * Save image alpha color
     *
     * @param resource $resource by default using $this->data['img'] resource
     * @return image
     */
	public function saveAlpha($resource = null){
        if(is_null($resource)) {
            $resource = $this->data['img'];
        }

        switch ($this->getType()) {
            case 'png':
                self::restoreAlphaColor($resource);
            break;
            case 'gif':
                self::restoreGifAlphaColor($this->data['img'], $resource);
            break;
        }
        return $this;
	}

    /**
     * Copy one image to another. Can be used for creating watermarks
     * Config format:
     * <ul>
     *   <li> int "x"</li>
     *   <li> int "y"</li>
     *   <li> int "opacity"</li>
     * </ul>
     *
     * @param string $path  path to watermark
     * @param array $cfg
     * @return image
     */
	public function mark($path, array $cfg) {
		$info = self::getImageInfo($path);
		$type = $this->getType();

        if(isset($cfg['opacity'])) {
            imagecopymerge($this->data['img'], $info['img'], $cfg['x'], $cfg['y'], 0, 0, $info['width'], $info['height'], $cfg['opacity']);
        } else {
            imagecopy($this->data['img'], $info['img'], $cfg['x'], $cfg['y'], 0, 0, $info['width'], $info['height']);
        }

        imagedestroy($info['img']);
        unset($info);

        return $this;
	}

    /**
     * Clone image resource
     */
    public function __clone() {
        $this->data = self::getImageInfo($this->data['src']);
        $this->isActive = (bool)$this->data;
    }

    /**
     * Get saved name
     *
     * @return string
     */
    public function __toString() {
        return $this->getSavedName();
    }

    /**
     * Check is image active
     *
     * @return bool
     */
    public function isActive(){
        return $this->isActive;
    }

    /**
     * Create thumbnails for current image.
     * Options format:
     * array(
     *  thumb_prefix => array(
     *    width => int
     *    height => int
     *    type   => int,
     *    crop   => string|array
     *   ),
     * .........................
     *  tmb_prefix => array(...)
     * )
     *
     * @see resizeMode
     * @param string $path      save based on path information
     * @param array  $options
     * @param bool   $override
     * @return array            saved thumbnails
     */
    public function createThumbs($path, array $options = null, $override = true) {
        if (empty($options)) return null;

        $info = $this->getPathInfo($path);
        $thumbs = array();

        foreach ($options as $prefix => $config) {
            $tmb = clone $this;
            $tmb->override = $override;
            if (isset($config['width']) && isset($config['height']) && isset($config['type'])) {
                $tmb->resize($config['width'], $config['height'], $config['type']);
            }
            if (isset($config['crop'])) {
                if (is_array($config['crop'])) {
                    $cfg = $config;
                } else {
                    $cfg = array('type' => $config['crop']);
                }
                $tmb->resize($config['width'], $config['height'], 'crop', $cfg);
            }
            $tmbname = $info['dirname'] . DIRECTORY_SEPARATOR . $prefix . $info['basename'];
            if (!$tmb->save($tmbname, empty($config['quality']) ? 65 : $config['quality'])) {
                return false;
            }
            $thumbs[] = $tmbname;
            $tmb->close();
        }

        return $thumbs;
    }

    /**
     * Get path info. This method is analog of built in "pathinfo".
     * But it can process files with utf8 names
     *
     * @param string $path
     * @param int    $flags see pathinfo()
     * @return array|string
     */
    public function getPathInfo($path, $flags = null) {
        $path = rtrim($path, DIRECTORY_SEPARATOR);
        if (strpos($path, DIRECTORY_SEPARATOR) !== false) {
            $path = str_replace(DIRECTORY_SEPARATOR, DIRECTORY_SEPARATOR . 'a', $path);
        } else {
            $path = 'a' . $path;
        }

        if ($flags === null) {
            $path = pathinfo($path);
        } else {
            $path = pathinfo($path, $flags);
        }

        if (is_array($path)) {
            if (isset($path['dirname'])) {
                $path['dirname'] = str_replace(DIRECTORY_SEPARATOR . 'a', DIRECTORY_SEPARATOR, $path['dirname']);
            }
            if (isset($path['basename'])) {
                $path['basename'] = substr($path['basename'], 1);
            }
            if (isset($path['filename'])) {
                $path['filename'] = substr($path['filename'], 1);
            }
        } elseif ($path[0] == 'a') {
            $path = substr($path, 1);
        }

        return $path;
    }
}
