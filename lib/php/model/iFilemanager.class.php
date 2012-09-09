<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Exception class
 *
 * @package    iFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
class sjException extends Exception {}

/**
 * I18n interface
 *
 * @package    iFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
interface sjI18nInterface {
    /**
     * Translate string
     *
     * @return string
     */
    public function __();
}

/**
 * Filesystem interface for iFilemanager class
 *
 * @package    iFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
interface sjFilesystem {
    /**
     * Remove dirs/files
     *
     * @param string $targetFile
     * @return void
     */
    function remove($targetFile);

    /**
     * Copy source to destination with special $options.
     *
     * @param string $sourceFile
     * @param string $targetFile
     * @param array  $options
     * @return bool is file exists
     */
    function copy($sourceFile, $targetFile, $options = array());

    /**
     * Change mode for files
     *
     * @param array $files
     * @param int   $mode
     * @param int   $umask = 0000
     * @return void
     */
    function chmod($files, $mode, $umask = 0000);

    /**
     * Creates a directory recursively.
     *
     * @param  string $path  The directory path
     * @param  int    $mode  The directory mode
     *
     * @return bool true if the directory has been created, false otherwise
     */
    function mkdirs($path, $mode = 0777);

    /**
     * Calculate directoty size
     *
     * @param string $path path to directory
     * @return int
     */
    function dirsize($path);

    /**
     * Read directory in specific mode. Use built in directory iterators.
     *
     * @param string $path
     * @param string $mode
     * @param array $options
     * @return array the array of containing directories and/or files
     */
    function readDir($path, $mode = null, array $options = null);

    /**
     * Get mime type of file
     *
     * @param string $targetFile
     * @return bool|array
     */
    function getMimeType($targetFile);

    /**
     * Canonicalize path
     *
     * @param string $path filesystem path
     * @return string
     */
    function canonicPath($path);

    /**
     * Generate uniq file name
     *
     * @param string $file path to file
     * @return string
     */
    function dynamicFileName($file);

    /**
     * Get file access mode
     *
     * @param string $target directory or file
     * @return string
     */
    function getMode($target);

    /**
     * Set i18n object
     *
     * @param sjI18nInterface $i18n
     * @return iFilesystem
     */
    public function setI18n(sjI18nInterface $i18n);

    /**
     * Get i18n object
     *
     * @return sjI18nInterface
     */
    public function getI18n();

    /**
     * Format size value in human readable format
     *
     * @param int $size
     * @return string
     */
    public function formatSizeValue($size);
}

/**
 * Filesystem class is based on sfFilesystem, implements sjFilesystem interface
 * and more complex than parent
 *
 * @package    iFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
class iFilesystem extends sfFilesystem implements sjFilesystem {
    protected static
        /**
         * Image class name. Class that gives interface to work with images
         */
        $imageClass = 'image',
        /**
         * Bad file's name symbols
         */
        $stripChars = array('/','\\','"',"'",'?','<','>',':', '|');

    /**
     * Translation object
     *
     * @var sjI18nInterface
     */
    protected $i18n;

    /**
     * Set i18n object
     *
     * @param sjI18nInterface $i18n
     * @return iFilesystem
     */
    public function setI18n(sjI18nInterface $i18n) {
        $this->i18n = $i18n;
        return $this;
    }

    /**
     * Get i18n object
     *
     * @return sjI18nInterface
     */
    public function getI18n() {
        return $this->i18n;
    }

    /**
     * Sort first directories then files
     *
     * @param string $path1
     * @param string $path2
     * @return int
     */
    protected function doSort($path1, $path2) {
        $is_dir1 = is_dir($path1);
        $is_dir2 = is_dir($path2);

        if ($is_dir1 && $is_dir2 || !$is_dir1 && !$is_dir2) {
            return strcasecmp($path1, $path2);
        }

        return $is_dir1 && !$is_dir2 ? -1 : 1;
    }

    /**
     * Prepare file name. Replace bad symbols to "-"
     *
     * @param string $filename
     * @return string cleanuped file name
     */
    public function prepareFilename($filename) {
        $info = $this->getPathInfo($filename);
        $filename = str_replace(self::$stripChars, '-', $info['basename']);
        $filename = preg_replace('/[\s-]+/', '-', $filename);
        $filename = trim($filename);
        if (isset($info['dirname']) && $info['dirname'] != DIRECTORY_SEPARATOR) {
            $info['dirname'] .= DIRECTORY_SEPARATOR;
        }
        return $info['dirname'] . trim($filename, '-');
    }

    /**
     * Calculate directory size. Return result in bytes
     *
     * @param string $path
     * @return int
     */
    public function dirsize($path) {
        $size = 0;
        foreach ($this->readDir($path, 'r', array('flags' => 0)) as $file) {
            $size += filesize($file);
        }
        return $size;
    }

    /**
     * Read directory using built in iterators.
     * Options format:
     * <ul>
     *   <li>int    "flags" - use only for recursive mode. Passed in RecursiveIteratorIterator constructor</li>
     *   <li>string "skip"  - skip regular expression.</li>
     *   <li>bool   "relative" - return list of files with relative path. By default return absolute path for each file.</li>
     *   <li>bool   "with_dir" - use for relative mode to return file's path with current dir name</li>
     *   <li>bool|callback "sort" - sort files by specific callaback. By default use $this->doSort method</li>
     * </ul>
     *
     * @see doSort
     *
     * @param string $path path to directory
     * @param string $mode if mode equal "r" is recursive mode, otherwise use simple mode
     * @param array  $options
     * @return array list of files and/or directories
     */
    public function readDir($path, $mode = null, array $options = null) {
        if (!is_dir($path)) {
            throw new sjException($this->getI18n()->__('Path "%s" is not a directory', $path));
        }

        if (!is_readable($path)) {
            throw new sjException($this->getI18n()->__('Permissions denied', $path));
        }

        $flags      = isset($options['flags']) ? $options['flags'] : RecursiveIteratorIterator::SELF_FIRST;
        $skip_regex = isset($options['skip']) ? $options['skip'] : false;

        switch ($mode) {
            case 'r':
                $dir_iterator = new RecursiveDirectoryIterator($path);
                $dir_iterator = new RecursiveIteratorIterator($dir_iterator, $flags, RecursiveIteratorIterator::CATCH_GET_CHILD);
            break;
            default:
                $dir_iterator = new DirectoryIterator($path);
            break;
        }

        $files   = array();
        $path    = rtrim($path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
        $is_relative = isset($options['relative']) && $options['relative'];
        $dirname = '';
        if (isset($options['with_dir']) && $options['with_dir']) {
            $dirname = basename($path) . DIRECTORY_SEPARATOR;
        }

        while ($dir_iterator->valid()) {
            $filename = $dir_iterator->getFilename();
            if ($filename == '.'  || $filename == '..' || $skip_regex && preg_match($skip_regex, $filename)) {
                $dir_iterator->next();
                continue;
            }
            $filename = $dir_iterator->getPathname();
            if ($is_relative) {
                $filename = str_replace($path, $dirname, $filename);
            }
            $files[] = $filename;
            $dir_iterator->next();
        }

        if (isset($options['sort']) && $options['sort']) {
            $files = $this->orderBy($files, $options['sort']);
        }

        $offset = 0;
        if (!empty($options['offset'])) {
            $offset = (int)$options['offset'];
        }

        $limit = count($files);
        if (!empty($options['limit'])) {
            $limit = (int)$options['limit'];
        }

        return array_slice($files, $offset, $limit);
    }

    /**
     * Sort files by specific callback. By default use $this->doSort
     *
     * @see doSort
     *
     * @param array $files
     * @param callable $callback
     * @return array - array of sorted files
     */
    public function orderBy(array $files, $callback = null) {
        $callback = is_callable($callback) ? $callback : array($this, 'doSort');
        usort($files, $callback);

        return $files;
    }

    /**
     * Return target information, like inode, number links, etc.
     *
     * @param string $targer - directory or file
     * @return array
     */
    public function stat($target) {
        $info = stat($target);
        $info['mode'] = $this->getMode($target);
        $info['atime'] = date('Y-m-d H:i:s', $info['atime']);
        $info['mtime'] = date('Y-m-d H:i:s', $info['mtime']);
        $info['ctime'] = date('Y-m-d H:i:s', $info['ctime']);

        return array_slice($info, 13);
    }

    /**
     * Get files mime type
     *
     * @param string|array $files
     * @return bool|array
     */
    public function getMimeType($files) {
        if (function_exists('finfo_open')) {
            $types = array();
            if (!is_array($files)) {
                $files = array($files);
            }
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            foreach ($files as &$file) {
                if (!is_file($file)) {
                    continue;
                }
                $types[$file] = finfo_file($finfo, $file);
            }
            finfo_close($finfo);

            return count($types) == 1 ? $types : reset($types);
        }

        return false;
    }

    /**
     * Return uniq file name
     *
     * @param string $file path to file
     * @return string
     */
    public function dynamicFileName($file) {
        $info = $this->getPathInfo($file);

        preg_match('/^([^(]+)\((\d+)\)/', $info['filename'], $exp);
        $i = isset($exp[2]) ? $exp[2] : 1;

        if (isset($exp[1])) {
            $info['filename'] = $exp[1];
        }
        $hasExtension = isset($info['extension']);
        while (file_exists($file)) {
            $file = $info['dirname'] . DIRECTORY_SEPARATOR . $info['filename'] . '(' . $i++ . ')';
            if ($hasExtension) {
                 $file .= '.' . $info['extension'];
            }
        }

        return $file;
    }

    /**
     * Get file access mode
     *
     * @param string $target directory or file
     * @return string
     */
    public function getMode($target) {
        return substr(decoct(fileperms($target)), 2);
    }

    /**
     * Canonicalize path
     *
     * @param string $path filesystem path
     * @return string
     */
    public function canonicPath($path) {
        return $this->canonicalizePath($path);
    }

    /**
     * Mirrors a directory to another.
     *
     * @throws sjException
     * @param string   $originDir  The origin directory
     * @param string   $targetDir  The target directory
     * @param array    $options    An array of options (see copy())
     * @return array               Processed items
     */
    public function mirrors($originDir, $targetDir, array $options = array()) {
        $options['relative'] = true;
        $items = array();

        foreach ($this->readDir($originDir, 'r', $options) as $file) {
            if (is_dir($originDir.DIRECTORY_SEPARATOR.$file)) {
                $this->mkdirs($targetDir.DIRECTORY_SEPARATOR.$file);
            } else if (is_file($originDir.DIRECTORY_SEPARATOR.$file)) {
                $this->copy($originDir.DIRECTORY_SEPARATOR.$file, $targetDir.DIRECTORY_SEPARATOR.$file, $options);
            } else if (is_link($originDir.DIRECTORY_SEPARATOR.$file)) {
                $this->symlink($originDir.DIRECTORY_SEPARATOR.$file, $targetDir.DIRECTORY_SEPARATOR.$file);
            } else {
                throw new sjException($this->getI18n()->__('Unable to guess "%s" file type.', $file));
            }
            $items[] = $targetDir.DIRECTORY_SEPARATOR.$file;
        }
        return $items;
    }

    /**
     * Copies a file.
     * By default, if the target already exists, it is not overriden.
     * To override existing files, pass the "override" option.
     * To create uniq file name, pass the "dynamic_name" option.
     * To process images files, you may pass "image" and "thumbs" options like arrays.
     * Image option format:
     * <ul>
     *   <li>int "width" - width</li>
     *   <li>int "height" - height</li>
     *   <li>string "type" - resize mode (width, height, auto, zoom, crop)</li>
     *   <li>string "crop" - crop type (left-top, left-bottom, right-top, right-bottom, center, specific array('x' => int, 'y' => int))</li>
     * </ul>
     * If you passed the "crop" image option then after resizing image will be croped using some of specific methods, otherwise it will be only resized
     *
     * @param string $originFile  The original filename
     * @param string $targetFile  The target filename
     * @param array  $options     An array of options
     * @return bool               if file copied
     */
    public function copy($originFile, $targetFile, $options = array()) {
        $targetFile = $this->prepareFilename($targetFile);
        $dynamic_name = isset($options['dynamic_name']) && $options['dynamic_name'];
        $options['override'] = isset($options['override']) && $options['override'];
        if ($dynamic_name) {
            $targetFile = $this->dynamicFileName($targetFile);
        }

        $image = false;
        if (isset($options['thumbs']) || isset($options['images'])) {
            $image = $this->createImage($originFile, $options['override']);
        }

        if ($image) {
            $files = $this->saveImage($image, $targetFile, $options);
        } else {
            parent::copy($originFile, $targetFile, $options);
            $files = array($targetFile);
        }

        return file_exists($targetFile) ? $files : false;
    }

    /**
     * Create image object interface to working with images when copies files
     *
     * @param string $path
     * @param bool   $override
     * @return bool|$imageClass false or instance of self::$imageClass
     */
    public function createImage($path, $override = true) {
        if (!class_exists(self::$imageClass, false)) {
            return false;
        }
        $image = self::$imageClass;
        $image = new $image($path);
        $image->override = $override;

        return $image->isActive() ? $image : false;
    }

    /**
     * Process saving of image
     *
     * @throws sjException
     * @param imageClass $image
     * @param string     $targetFile
     * @param array      $options (see copy() method)
     */
    protected function saveImage($image, $targetFile, array $options = array()) {
        if (!empty($options['images']) && is_array($options['images'])) {
            $targetFile = $image->createThumbs($targetFile, array('' => $options['images']));
            if ($targetFile) {
                $targetFile = current($targetFile);
            }
        } else {
            $image->save($targetFile);
            $targetFile = $image->getSavedName();
        }
        $thumbs = array();
        if ($targetFile) {
            if (!empty($options['thumbs']) && is_array($options['thumbs'])) {
                $thumbs = $image->createThumbs($targetFile, $options['thumbs']);
                if (!$thumbs) {
                    throw new sjException($this->getI18n()->__('Can not create thumbs for "%s"', $targetFile), 12);
                }
            }
        } else {
            throw new sjException($this->getI18n()->__('Can not save image "%s"', $targetFile));
        }

        $thumbs[] = $targetFile;
        return $thumbs;
    }

    /**
     * Format size of file/folder in human readable format
     *
     * @param string $file  path to file
     * @return string
     */
    public function formatSize($file) {
        if (!is_readable($file)) {
            throw new sjException($this->getI18n()->__('Permissions denied', $file));
        }

        $size = is_dir($file) ? $this->dirsize($file) : filesize($file);

        return $this->formatSizeValue($size);
    }

    /**
     * Format size value in human readable format
     *
     * @param int $size
     * @return string
     */
    public function formatSizeValue($size) {
        $type = '';
        if($size > 1024){
            $size /= 1024;
            $type = 'k';
        }

        if($size > 1024){
            $size /= 1024;
            $type = 'M';
        }

        if($size > 1024){
            $size /= 1024;
            $type = 'G';
        }

        if($size > 1024){
            $size /= 1024;
            $type = 'T';
        }

        $size = (float)number_format($size, 2);
        return $size . ' ' . $type;
    }

    /**
     * Format date in human readable format. Use built in "date" function
     *
     * @param string $date
     * @return string
     */
    public function formatDate($date, $format = 'Y-m-d H:i:s') {
        return date($format, $date);
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
        } elseif ($flags == PATHINFO_DIRNAME) {
            $path = str_replace(DIRECTORY_SEPARATOR . 'a', DIRECTORY_SEPARATOR, $path);
        }

        return $path;
    }

    /**
     * Renames a file.
     *
     * @param string $origin  The origin filename
     * @param string $target  The new filename
     */
    public function rename($origin, $target) {
        // we check that target does not exist
        if (is_readable($target)) {
            throw new sjException($this->getI18n()->__('Cannot rename because the target "%s" already exist.', $target));
        }

        rename($origin, $target);
    }

    /**
     * Removes files or directories.
     *
     * @throws sjException
     * @param mixed $files  A filename or an array of files to remove
     */
    public function remove($files) {
        if (!is_array($files)) {
            $files = array($files);
        }

        $files = array_reverse($files);
        foreach ($files as $file) {
            if (is_dir($file) && !is_link($file)) {
                $result = @rmdir($file);
                $message = 'Unable to remove directory. It seems directory is not empty or not enough permissions.';
            } else {
                $result = @unlink($file);
                $message = 'Unable to remove file. Maybe not enough permissions?';
            }

            if (!$result) {
                throw new sjException($this->getI18n()->__($message));
            }
        }
    }
}

/**
 * Translation class
 *
 * @package    iFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
class sjI18n implements sjI18nInterface {
    /**
     * Translation vocabulary
     *
     * @var array
     */
    protected $vocabulary;

    /**
     * Hidden strings list
     *
     * @var array
     */
    protected $hiddenStrings = array();

    /**
     * Constructor
     *
     * @param array $vocabulary
     * @return sjI18n
     */
    public function __construct(array $vocabulary) {
        $this->setVocabulary($vocabulary);
    }

    /**
     * Set vocabulary array
     *
     * @param array $vocabulary
     * @return sjI18n
     */
    public function setVocabulary(array $vocabulary) {
        $this->vocabulary = $vocabulary;
        return $this;
    }

    /**
     * Translate string
     *
     * @param string $tmpl
     * @param mixed  $var
     * ..................
     * @param mixed  $var
     * @return string
     */
    public function __() {
        $args = func_get_args();
        $string = $args[0];
        if (isset($this->vocabulary[$string])) {
            $string = $this->vocabulary[$string];
        }

        if (isset($args[1])) {
            $args[0] = $string;
            $string = call_user_func_array('sprintf', $args);
        }
        $string = strtr($string, $this->hiddenStrings);
        return $string;
    }

    /**
     * Set hidden strings replacements
     *
     * @param array $strings
     * @return sjI18n
     */
    public function setHiddenStrings(array $strings) {
        $this->hiddenStrings = $strings;
        return $this;
    }
}

/**
 * Filemanager class
 *
 * @package    iFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
class iFilemanager {
    protected static
        /**
         * Class name of filemanager
         */
        $class      = 'iFilemanager';
    protected
        /**
         * Filemanager options
         *  * int "compressGreater" - if file greater then this value (in bytes), using in method save() it will be compressed for user
         */
        $options = array(
            'compressGreater' => 1000000
        ),
        /**
         * Instance of sjFilesystem interface
         */
        $fs = null,
        /**
         * Array of imported files
         */
        $files = array();

    /**
     * Get i18n object
     *
     * @return sjI18nInterface
     */
    public function getI18n() {
        return $this->fs->getI18n();
    }

    /**
     * Set filemanager class name.
     * The object of this class must be an instance of iFilemanager
     *
     * @param string $class
     * @return bool
     */
    public static function setClass($class) {
        $exists = class_exists($class);
        if ($exists) {
            self::$class = $class;
        }
        return $exists;
    }

    /**
     * Create filemanager.
     * This method implements the factory pattern.
     *
     * @return bool|iFilemanager
     */
    public static function create() {
        $class = self::$class;
        $object = new $class();

        return $object instanceof iFilemanager ? $object : false;
    }

    /**
     * Stupid method to detect if array of files has format like $_FILES
     *
     * @param array $files
     * @return bool
     */
    protected static function isUploadFiles(array $files) {
        $first = reset($files);
        return isset($files['name']) && isset($files['type'])
            && isset($files['tmp_name']) && isset($files['error'])
            && isset($files['size'])
            || is_array($first) && self::isUploadFiles($first);
    }

    /**
     * Prepare files for import.
     * Get basic information of file.
     *
     * @param string $file  path to file/directory
     * @param mixed  $i     key of imported array
     * @return void
     */
    protected function prepareFiles(&$file, $i){
        $info = $this->fs->getPathInfo($file);
        $filename = $info['basename'];
        if (empty($filename)) return false;

        $fullpath = $info['dirname'] . DIRECTORY_SEPARATOR . $filename;

        $this->files['name'][]  = $filename;
        $this->files['type'][]  = is_file($fullpath) ? $this->fs->getMimeType($fullpath) : '';
        $this->files['path'][]  = $fullpath;
        $this->files['error'][] = (int)!file_exists($fullpath);
        $this->files['size'][]  = is_dir($fullpath) ? $this->fs->dirsize($fullpath) : (int)filesize($fullpath);
    }

    /**
     * Prepare files that were uploaded.
     * This method was created for import php built in super
     * global array $_FILES. But it has some restrictions.
     * Detect only one nested level
     *
     * @param array $files
     * @return void
     */
    protected function prepareUploadFiles(array $files) {
        if (is_array($files['name'])) {
            foreach ($files['name'] as $key => &$file) {
                $this->files['name'][]  = $file;
                $this->files['type'][]  = $files['type'][$key];
                $this->files['path'][]  = $files['tmp_name'][$key];
                $this->files['error'][] = (int)$files['error'][$key];
                $this->files['size'][]  = (int)$files['size'][$key];
            }
        } else {
            $this->files['name'][]  = $files['name'];
            $this->files['type'][]  = $files['type'];
            $this->files['path'][]  = $files['tmp_name'];
            $this->files['error'][] = (int)$files['error'];
            $this->files['size'][]  = (int)$files['size'];
        }
    }

    /**
     * Set headers for send files to user in browser
     *
     * @param string $file      path to file
     * @param string $filename  file name
     * @return void
     */
    protected function setHeaders($file, $filename = '') {
        if (!$filename) {
            $filename = $this->fs->getFileInfo($file, PATHINFO_BASENAME);
        }
        $contentType = $this->fs->getMimeType($file);
        if (!$contentType) {
            $contentType = 'application/octet-stream';
        }

        header('Content-type: ' . $contentType);
        header('Expires: ' . gmdate('D, d M Y H:i:s') . ' GMT');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Accept-Ranges: bytes');
        header('Content-Length: '.filesize($file));
        if (strpos($_SERVER['HTTP_USER_AGENT'], 'MSIE') !== false) {
            header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
            header('Pragma: public');
        } else {
            header('Pragma: no-cache');
        }
    }

    /**
     * Get information about file in another format. (see exec())
     *
     * @param int $key  key of file in $this->files array
     * @return array
     */
    protected function getFileInfo($key) {
        $keys = array_keys($this->files);
        $data = array();
        foreach ($keys as &$field) {
            $data[$field] = $this->files[$field][$key];
        }

        return $data;
    }

    /**
     * Set filesystem object.
     *
     * @param sjFilesystem $filesystem
     * @return iFilemanager
     */
    public function setFilesystem(sjFilesystem $filesystem) {
        $this->fs = $filesystem;
        return $this;
    }

    /**
     * Import array of files into filemanager
     *
     * @throws sjException
     * @param string|array $files
     * @return iFilemanager
     */
    public function import($files) {
        if (!$this->fs instanceof sjFilesystem) {
            throw new sjException(
                $this->getI18n()->__('Before doing some operation you must set Filesystem object, instance of sjFilesystem')
            );
        }

        if (empty($files)) {
            return false;
        }

        if (!is_array($files)) {
            $files = array($files);
        }

        if (self::isUploadFiles($files)) {
            $callback = 'prepareUploadFiles';
        } else {
            $callback = 'prepareFiles';
        }


        array_walk($files, array($this, $callback));

        return $this;
    }

    /**
     * Paste files into directory with specific options.
     * Options format:
     * <ul>
     *   <li>int "max_size"   - max size in bytes</li>
     *   <li>bool "dry_run"   - do not throw exceptions</li>
     *   <li>bool "skip_dirs" - make mirror of all dirs in filemanager or just skip them</li>
     *   <li>bool "override"  - see iFilesystem->copy()</li>
     *   <li>bool "dynamic_name" - see iFilesystem->copy()</li>
     *   <li>array "image"       - see iFilesystem->copy()</li>
     *   <li>array "thumbs"      - see iFilesystem->copy()</li>
     *   <li>int   "chmod"       - set mode for processed files</li>
     *   <li>bool  "move"        - if true then old files will be removed</li>
     *   <li>array "allowed_types" - array of allowed file extensions</li>
     * </ul>
     *
     * @throws sjException
     * @param string $to        path to directory
     * @param array  $options
     * @return iFilemanager
     */
    public function paste($to, array $options = array()) {
        $to = trim($to);
        $to = $this->fs->canonicPath($to);
        if (empty($to) || empty($this->files)) {
            throw new sjException($this->getI18n()->__('Can not move files if destination or files array is empty'));
        }

        if (!is_writable($to)) {
            throw new sjException($this->getI18n()->__('The folder "%s" does not writable', $to));
        }

        $max_size = isset($options['max_size']) ? $options['max_size'] : false;

        if($max_size && (int)$this->getFullSize() > $max_size) {
            throw new sjException($this->getI18n()->__('Uploaded files size greater then "%s"', $this->fs->formatSizeValue($max_size)), 1);
        }

        $dry_run = isset($options['dry_run']) && $options['dry_run'];
        $allowed_types = isset($options['allowed_types']) ? $options['allowed_types'] : false;

        $targetFiles  = array();
        $srcFiles     = array();

        $to = rtrim($to,'/') . '/';
        $skip_dirs = isset($options['skip_dirs']) && $options['skip_dirs'];
        foreach ($this->files['name'] as $key => &$filename) {
            if (!$skip_dirs && is_dir($this->files['path'][$key])) {
                $result = $this->fs->mirrors($this->files['path'][$key], $to);
                $targetFiles = array_merge($result, $targetFiles);
                continue;
            }
            if ($this->files['size'][$key] <= 0) {
                if ($dry_run) {
                    continue;
                } else {
                    throw new sjException($this->getI18n()->__('Size of "%s" <= 0', $this->files['path'][$key]), 7);
                }
            } elseif ($this->files['error'][$key]) {
                if ($dry_run) {
                    continue;
                } else {
                    throw new sjException(
                        $this->getI18n()->__('Error ocured during the upload process on "%s"', $this->files['path'][$key]),
                        $this->files['error'][$key]
                    );
                }
            }

            $extension = strtolower($this->fs->getPathInfo($filename, PATHINFO_EXTENSION));
            if ($allowed_types && !in_array($extension, $allowed_types)) {
                if ($dry_run) {
                    continue;
                } else {
                    throw new sjException($this->getI18n()->__('Files with extension "%s" does not allowed', $extension), 10);
                }
            }

            $result = $this->fs->copy($this->files['path'][$key], $to . $filename, $options);
            if (!$result) {
                if ($dry_run) {
                    continue;
                } else {
                    throw new sjException($this->getI18n()->__('Can not copy file "%s" to destination "%s"', $this->files['path'][$key], $to), 11);
                }
            }
            $targetFiles = array_merge($result, $targetFiles);
            $srcFiles[] = $this->files['path'][$key];
        }

        $chmod = isset($options['chmod']) ? $options['chmod'] : 0744;
        $this->fs->chmod($targetFiles, $chmod);

        if (isset($options['move']) && $options['move']) {
            $this->fs->remove($srcFiles);
        }

        return $this;
    }

    /**
     * Compress files using ZipArchive class
     *
     * @todo implements another compress formats. Maybe create compress driver attribute
     *
     * @throws sjException
     * @param string $filename  file name of new archive
     * @return iFilemanager
     */
    public function compress($filename) {
        if (!class_exists('ZipArchive')) {
            throw new sjException($this->getI18n()->__('class ZipArchive does not exists'));
        }
        $zip = new ZipArchive();

        if($zip->open($filename, ZIPARCHIVE::CREATE) !== true){
            throw new sjException($this->getI18n()->__('Can not create zip archive "%s"', $filename));
        }

        $options = array('flags' => 0, 'relative' => true);
        foreach ($this->files['path'] as &$path) {
            if (is_dir($path)) {
                $path = rtrim($path, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
                foreach ($this->fs->readDir($path, 'r', $options) as $file) {
                    if (!$zip->addFile($path . $file, $file)) {
                        throw new sjException($this->getI18n()->__('Can not add "%s" to zip archive', $path));
                    }
                }
            } else {
                if (!$zip->addFile($path, basename($path))) {
                    throw new sjException($this->getI18n()->__('Can not add "%s" to zip archive', $path));
                }
            }
        }
        $zip->close();
        return $this;
    }

    /**
     * Send files to user agent.
     * Using compress method if $this->files contains directories
     *
     * @throws sjException
     * @param string $filename
     * @return iFilemanager
     */
    public function send($filename = null) {
        if ($this->isEmpty()) return false;

        $first = reset($this->files['path']);
        $use_compress = $this->count() > 1 || is_dir($first) || reset($this->files['size']) > $this->options['compressGreater'];

        if ($use_compress) {
            $tmp_name = sys_get_temp_dir() . DIRECTORY_SEPARATOR . uniqid('ifm_', true).'.zip';
            $this->compress($tmp_name);
        } else {
            $tmp_name = $first;
        }

        if (is_dir($tmp_name)) {
            throw new sjException($this->getI18n()->__('Can not send uncompressed directory'));
        }

        if (!$filename && !$use_compress) {
            $first = current($this->files['name']);
            $filename = $first;
        } elseif (!$filename) {
            $filename = $tmp_name;
        }
        $this->setHeaders($tmp_name, $filename);
        readfile($tmp_name);
        if ($use_compress) {
            $this->fs->remove($tmp_name);
        }
        return $this;
    }

    /**
     * Get size in bytes of all files/dirs imported in filemanager
     *
     * @return int
     */
    public function getFullSize() {
        if ($this->isEmpty()) return false;
        return array_sum($this->files['size']);
    }

    /**
     * Check is empty $this->files
     *
     * @return bool
     */
    public function isEmpty() {
        return empty($this->files);
    }

    /**
     * Count files in filemanager
     *
     * @return int
     */
    public function count() {
        if ($this->isEmpty()) return 0;
        return count($this->files['name']);
    }

    /**
     * Dump $this->files usinng print_r built in function.
     * Simple method for debuging
     *
     * @return iFilemanager
     */
    public function dump() {
        echo '<pre>';
        print_r($this->files);
        echo '</pre>';
        return $this;
    }

    /**
     * Remove all files/dirs from $this->files
     * and clean up filemanager
     *
     * @return iFilemanager
     */
    public function removeAll() {
        $this->fs->remove($this->files['path']);
        $this->clear();
        return $this;
    }

    /**
     * Clear filemanager
     *
     * @return iFilemanager
     */
    public function clear() {
        $this->files = array();
        return $this;
    }

    /**
     * Get files part by default it is path of file
     *
     * @param string $part  one of the (type, name, path, error, size)
     * @return array
     */
    public function get($part = 'path') {
        return $this->files[$part];
    }

    /**
     * Iterate through all files and apply some callback
     *
     * @throws sjException
     * @param mixed $callable
     * @param bool  $apply      apply changes to filemanager
     * @param array $user_data  pass some arguments to callable
     * @return array            info returned callable for each file
     */
    public function exec($callable, $apply = false, array $user_data = array()) {
        if (!is_callable($callable)
            && is_array($callable) && !method_exists($callable[0], $callable[1])
            && !function_exists($callable)
        ) {
            throw new sjException($this->getI18n()->__('Invalid callable for exec method'));
        }

        $result    = array();
        $processed = array();
        $user_data = array('file' => 0, 'fs' => $this->fs);
        foreach ($this->files['path'] as $key => $file) {
            $user_data['file'] = $file;
            $user_data['info'] = $this->getFileInfo($key);
            $data = call_user_func_array($callable, $user_data);
            if ($data) {
                $processed[] = $file;
                $result[]    = $data;
            }
        }

        if ($apply) {
            $this->clear();
            $this->import($processed);
        }

        return $result;
    }
}
