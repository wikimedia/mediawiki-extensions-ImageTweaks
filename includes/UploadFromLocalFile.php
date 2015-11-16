<?php
/**
 * Backend for uploading files from uploading a file. Based on
 * UploadFromRequest.
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

/**
 * Implements uploading from a local file.
 *
 * @ingroup Upload
 * @author Bryan Tong Minh
 * @author Michael Dale
 */
class UploadFromLocalFile extends UploadFromRequest {
	protected $mRequest;
	protected $mIgnoreWarnings = true;
	protected $mTempPath, $mTmpHandle;

	protected static $mdargs = array(
		'cropx',
		'cropy',
		'cropwidth',
		'cropheight',
		'rotatedegrees',
		'rotatecolor',
	);

	public static function getAllowedArguments() {
		return self::$mdargs;
	}

	/**
	 * Entry point
	 *
	 * @param string $name
	 * @param string $sourcename
	 * @throws MWException
	 */
	public function initializeFromData( $name, $sourcename, $actions, $args, $url ) {
		$repoGroup = RepoGroup::singleton();
		$repoGroup->initialiseRepos();
		$repo = $repoGroup->getLocalRepo();
		$title = Title::newFromText( $sourcename );

		if ( !$title->inNamespace( NS_FILE ) ) {
			$title = Title::newFromText( 'File:' . $sourcename );
		}

		$file = $repo->findFile( $title );

		if ( !$file ) {
			$file = $repo->findFile( $sourcename );
			
			if ( !$file ) {
				throw new Exception( 'File not found' );
			}
		}

		$request = MWHttpRequest::factory( $url, array(
			'method' => 'POST',
		) );

		if ( !$request::SUPPORTS_FILE_POSTS ) {
			throw new Exception( 'cURL support is required for this API module. ' );
		}

		$request->setHeader( 'Content-type', 'multipart/form-data' );
		$request->setData( array(
			'file' => new CURLFile( $file->getLocalRefPath() ),
			'action' => implode( $actions, '|' ),
		) + $args );

		parent::initialize( $name, $request );
	}

	public function initializeFromParams( $params, $url ) {
		$filename = $params[ 'file' ];
		$destfilename = $params[ 'destfile' ];
		$actions = $params[ 'action' ];
		$args = $this->getMDArgs( $params );

		$this->initializeFromData( $destfilename, $filename, $actions, $args, $url );
	}

	protected function getMDArgs( $params ) {
		$args = array();

		foreach ( $params as $param => $val ) {
			if ( in_array( $param, $this::$mdargs ) ) {
				$args[ $param ] = $val;
			}
		}

		return $args;
	}

	/**
	 * @return string
	 */
	public function getSourceType() {
		return 'localfile';
	}
}
