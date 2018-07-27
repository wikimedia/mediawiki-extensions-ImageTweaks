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

	return true;
}

die( 'This version of the ImageTweaks extension requires MediaWiki 1.25+.' );
