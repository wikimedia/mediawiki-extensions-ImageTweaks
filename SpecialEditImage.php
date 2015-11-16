<?php
/**
 * Special:EditImage
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
 * @ingroup Extension
 */

class SpecialEditImage extends FormSpecialPage {
	protected $mDestFilename;

	public function __construct( $request = null ) {
		parent::__construct( 'EditImage', 'upload' );
	}

	public function execute( $destfilename ) {
		if ( isset( $destfilename ) ) {
			$this->mDestFilename = $destfilename;
		}

		parent::execute( '' );
	}

	protected function getFormFields() {
		$beforeFields = array(
			'file' => array(
				'label' => $this->msg( 'editimage-sourcefile-label' ),
				'default' => $this->mDestFilename,
			),

			'destfile' => array(
				'label' => $this->msg( 'editimage-destfile-label' ),
				'type' => 'text',
			),

			'action' => array(
				'label' => $this->msg( 'editimage-action-label' ),
				'type' => 'text',
			),
		);

		if ( isset( $this->mDestFilename ) ) {
			$beforeFields[ 'file' ][ 'class' ] = 'HTMLImageDisplayField';
		} else {
			$beforeFields[ 'file' ][ 'type' ] = 'text';
		}

		$argFields = array();
		$args = UploadFromLocalFile::getAllowedArguments();

		foreach ( $args as $arg ) {
			$argFields[$arg] = array(
				'label' => $this->msg( 'editimage-mdarg-' . $arg . '-label' ),
				'type' => 'text',
			);
		}

		$afterFields = array(
			'comment' => array(
				'label' => $this->msg( 'editimage-comment-label' ),
				'type' => 'text',
			),

			'text' => array(
				'label' => $this->msg( 'editimage-text-label' ),
				'type' => 'textarea',
			),
		);

		return $beforeFields + $argFields + $afterFields;
	}

	protected function getDisplayFormat() {
		return 'ooui';
	}

	public function onSubmit( array $data ) {
		$config = $this->getConfig();
		$mediaDevilryURL = $config->get( 'ImageTweaksMediaDevilryURL' ) . '/transform';

		$upload = new UploadFromLocalFile;
		$data['action'] = explode( '|', $data['action'] );
		$upload->initializeFromParams( $data, $mediaDevilryURL );
		$upload->fetchFile();
		return $upload->performUpload( $data['comment'], $data['text'], false, $this->getUser() );
	}
}
