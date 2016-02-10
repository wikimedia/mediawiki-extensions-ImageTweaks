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
		$status = $upload->performUpload( $params['comment'], $params['text'], false, $this->getUser() );

		if ( !$status->isGood() ) {
			$error = $status->getErrorsArray();

			if ( count( $error ) == 1 && $error[0][0] == 'async' ) {
				// The upload can not be performed right now, because the user
				// requested so
				$result = array(
					'result' => 'Queued',
					'statuskey' => $error[0][1],
				);
			}

			ApiResult::setIndexedTagName( $error, 'error' );
			$this->dieUsage( 'An internal error occurred', 'internal-error', 0, $error );
		} else {
			$file = $upload->getLocalFile();

			$result = array(
				'result' => 'Success',
				'filename' => $file->getName(),
			);
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
