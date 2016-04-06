<?php
/**
 * Hooks for ImageTweaks extension
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 * http://www.gnu.org/copyleft/gpl.html
 *
 * @file
 * @ingroup Extensions
 */

class ImageTweaksHooks {
	public static function onRegistration() {
		return true;
	}

	public static function onSetup() {
		return true;
	}

	public static function addBetaPreference( User $user, array &$preferences ) {
		$coreConfig = RequestContext::getMain()->getConfig();
		$iconpath = $coreConfig->get( 'ExtensionAssetsPath' ) . "/ImageTweaks";
		$preferences['image-tweaks'] = array(
			'version' => '1.0',
			'label-message' => 'imagetweaks-beta-preference-label',
			'desc-message' => 'imagetweaks-beta-preference-desc',
			'screenshot' => array(
				'ltr' => "$iconpath/betafeatures-icon-ImageTweaks-ltr.svg",
				'rtl' => "$iconpath/betafeatures-icon-ImageTweaks-rtl.svg",
			),
			'info-message' => 'imagetweaks-beta-preference-info-link',
			'discussion-message' => 'imagetweaks-beta-preference-disc-link',
			'requirements' => array(
				'javascript' => true,
			),
		);
	}

	/**
	 * Handler for BeforePageDisplay hook
	 * Adds ImageTweaks bootstrap module to file pages when the
	 * user has enabled the feature.
	 * @param OutputPage $out
	 * @param Skin $skin
	 * @return bool
	 */
	public static function getModulesForFilePage( &$out, &$skin ) {
		if ( $out->getTitle()->inNamespace( NS_FILE ) ) {
			$user = $out->getUser();
			$conf = $out->getConfig();
			$enabled = $conf->get( 'ImageTweaksEnabled' );
			$inbeta = $conf->get( 'ImageTweaksInBeta' );

			if ( $enabled && $inbeta && class_exists( 'BetaFeatures' ) ) {
				$enabled = BetaFeatures::isFeatureEnabled( $out->getUser(), 'image-tweaks' );
			}

			if ( $enabled ) {
				$out->addModules( array( 'imagetweaks.bootstrap' ) );
			}
		}

		return true;
	}
}
