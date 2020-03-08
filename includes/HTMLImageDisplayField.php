<?php
/**
 * Quick little widget for displaying an image in a form.
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
 * @ingroup Upload
 */

use MediaWiki\MediaWikiServices;

class HTMLImageDisplayField extends HTMLFormField {
	function getInputHTML( $value ) {
		$attribs = [
			'id' => $this->mID,
		] + $this->getTooltipAndAccessKey();

		if ( $this->mClass !== '' ) {
			$attribs['class'] = $this->mClass;
		}

		# @todo Enforce pattern, step, required, readonly on the server side as
		# well
		$allowedParams = [
			'width',
			'height',
		];

		$attribs += $this->getAttributes( $allowedParams );

		$title = Title::newFromText( $value );

		if ( $title ) {
			if ( !$title->inNamespace( NS_FILE ) ) {
				$title = Title::newFromText( 'File:' . $value );
			}

			$file = MediaWikiServices::getInstance()->getRepoGroup()->getLocalRepo()
				->findFile( $title );

			if ( $file ) {
				$thumb = $file->transform( [ 'width' => 400, 'height' => 400 ] );
				$p = Html::element( 'p', [], $title->getPrefixedText() );
				$image = Html::element( 'img', [ 'src' => $thumb->getUrl() ] + $attribs );
				return Html::rawElement( 'div', [], $p . $image );
			}
		}
	}

	function getInputOOUI( $value ) {
		// Lazy
		return $this->getInputHTML( $value );
	}
}
