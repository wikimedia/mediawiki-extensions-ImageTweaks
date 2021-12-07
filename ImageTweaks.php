<?php

/**
 * ImageTweaks extension
 *
 * This PHP entry point is deprecated. Please use wfLoadExtension() and the extension.json file
 * instead. See https://www.mediawiki.org/wiki/Manual:Extension_registration for more details.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2015 Mark Holmquist and others; see AUTHORS.txt
 * @license GNU General Public License version 3.0; see LICENSE.txt
 */

if ( function_exists( 'wfLoadExtension' ) ) {
	wfLoadExtension( 'ImageTweaks' );
	wfWarn(
		'Deprecated PHP entry point used for ImageTweaks extension. Please use wfLoadExtension instead, ' .
		'see https://www.mediawiki.org/wiki/Extension_registration for more details.'
	);
	return true;
}

die( 'This version of the ImageTweaks extension requires MediaWiki 1.36+.' );
