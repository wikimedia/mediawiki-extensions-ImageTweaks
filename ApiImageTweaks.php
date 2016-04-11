<?php
/**
 * MediaDevilry API wrapper.
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
 * @ingroup Api
 *
 * @copyright 2015 Mark Holmquist
 * @license GNU General Public License version 2.0
 */

class ApiImageTweaks extends ApiBase {
	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'it' );
	}

	public function execute() {
		$config = $this->getConfig();
		$thumborURL = $config->get( 'ImageTweaksThumborURL' );

		if ( !isset( $thumborURL ) ) {
			$this->dieUsage( 'Thumbor is not configured for this instance of MediaWiki.' );
		}
		$params = $this->extractRequestParams();
		$upload = new UploadFromLocalFile;
		$upload->initializeFromParams( $params, $thumborURL );
		$upload->fetchFile();

		$result = array();

		if ( !$params['stash'] ) {
			$status = $upload->performUpload( $params['comment'], $params['text'], false, $this->getUser() );

			if ( !$status->isGood() ) {
				$error = $status->getErrorsArray();
				ApiResult::setIndexedTagName( $error, 'error' );
				$this->dieUsage( 'An internal error occurred', 'internal-error', 0, $error );
			} else {
				$file = $upload->getLocalFile();

				$result[ 'result' ] = 'Success';
				$result[ 'filename' ] = $file->getName();
			}
		} else {
			try {
				$stashFile = $upload->stashFile( $this->getUser() );

				if ( !$stashFile ) {
					throw new MWException( 'Invalid stashed file' );
				}

				$result[ 'result' ] = 'Stashed';
				$result[ 'filekey' ] = $stashFile->getFileKey();
			} catch ( Exception $e ) {
				$className = get_class( $e );
				$message = 'Stashing temporary file failed: ' . $className . ' ' . $e->getMessage();
				wfDebug( __METHOD__ . ' ' . $message . "\n" );
				throw new $className( $message );
			}
		}

		$this->getResult()->addValue( null, $this->getModuleName(), $result );
	}

	public function getAllowedParams() {
		return array(
			'text' => array(
				ApiBase::PARAM_TYPE => 'string',
			),

			'comment' => array(
				ApiBase::PARAM_TYPE => 'string',
			),

			'file' => array(
				ApiBase::PARAM_TYPE => 'string',
			),

			'destfile' => array(
				ApiBase::PARAM_TYPE => 'string',
			),

			'filters' => array(
				ApiBase::PARAM_TYPE => 'string',
			),

			'stash' => array(
				ApiBase::PARAM_TYPE => 'boolean',
			),
		);
	}

	public function getDescription() {
		return 'Create a derivative image based on an image already on the wiki. Note: There is a strong likelihood that you will go over the URL length limit with a request to this API module, so you should use a POST request instead.';
	}

	public function getExamples() {
		return array(
		);
	}
}
