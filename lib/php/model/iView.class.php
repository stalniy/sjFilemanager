<?php
/*
 * This file is part of the iFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Simple view class
 *
 * @package    iFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
class iView {
    protected static
        /**
         * Path to view root directory
         *
         * @var string
         */
        $root = '/';
    protected
        $template,
        /**
         * Translation object
         *
         * @var sjI18nInterface
         */
        $i18n;

    /**
     * Set i18n object
     *
     * @param sjI18nInterface $i18n
     * @return iView
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
     * Set template root
     *
     * @throws sjException
     * @param string $root  directory path
     * @return void
     */
    public static function setRoot($root) {
        if (!is_dir($root) || !is_readable($root)) {
            throw new sjException($this->getI18n()->__('Root directory for view is not readable or not exists'));
        }
        self::$root = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    }

    /**
     * Constructor
     *
     * @param string $tmpl  template filename name without extension
     */
    public function __construct($tmpl) {
        $this->setTemplate($tmpl);
    }

    /**
     * Set template
     *
     * @throws sjException
     * @param string $tmpl
     * @return iView
     */
    public function setTemplate($tmpl) {
        $file = self::$root . $tmpl . '.php';
        if (!file_exists($file) || !is_readable($file)) {
            throw new sjException(sprintf('Template "%s" is not readable or not exists', $file));
        }
        $this->template = $tmpl;
        return $this;
    }

    /**
     * Render template.
     * Disabling error reporting for required template.
     *
     * @param array $params
     * @return iView
     */
    public function render(array $params = array()) {
        extract($params);
        $view = $this;

        error_reporting(E_ERROR);
        require self::$root . $this->template . '.php';
        error_reporting(E_ALL);
        return $this;
    }

    /**
     * Display simple template
     *
     * @param string $tmpl
     * @param array  $params
     * @return iView
     */
    public function display($tmpl, array $params = array()) {
        $this->setTemplate($tmpl);
        return $this->render($params);
    }

    /**
     * Begin stripping. Using in templates.
     * Remove spaces between tags.
     *
     * @return void
     */
    public function strip() {
        ob_start();
    }

    /**
     * End stripping.
     *
     * @return void
     */
    public function strip_end() {
        $content = ob_get_contents();
        ob_end_clean();

        $content = preg_replace('/\s+/', ' ',$content);
        $content = preg_replace(array('/\s*>[\n\r\t ]+</', '/ +/'), array('><', ' '), $content);

        echo $content;
    }
}
