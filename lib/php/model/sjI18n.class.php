<?php
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