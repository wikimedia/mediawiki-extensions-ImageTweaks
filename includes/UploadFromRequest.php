<?php
/**
 * Backend for uploading files from a request. Based on UploadFromUrl
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
 * Implements uploading from a HTTP request.
 *
 * @ingroup Upload
 * @author Bryan Tong Minh
 * @author Michael Dale
 * @author Mark Holmquist
 */
class UploadFromRequest extends UploadBase {
	protected $mRequest;
	protected $mIgnoreWarnings = true;
	protected $mTempPath, $mTmpHandle;

	/**
	 * Entry point
	 *
	 * @param string $name
	 * @param MWHttpRequest $request
	 * @throws MWException
	 */
	public function initialize( $name, $request ) {
		$this->mRequest = $request;

		$tempPath = $this->makeTemporaryFile();
		# File size and removeTempFile will be filled in later
		$this->initializePathInfo( $name, $tempPath, 0, false );
	}

	public function initializeFromRequest( &$request ) {
		// Unimplemented
	}

	/**
	 * @return string
	 */
	public function getSourceType() {
		return 'request';
	}

	/**
	 * Create a new temporary file in the URL subdirectory of wfTempDir().
	 *
	 * @return string Path to the file
	 */
	protected function makeTemporaryFile() {
		$tmpFile = TempFSFile::factory( 'URL' );
		$tmpFile->bind( $this );

		return $tmpFile->getPath();
	}

	/**
	 * Callback: save a chunk of the result of a HTTP request to the temporary file
	 *
	 * @param mixed $req
	 * @param string $buffer
	 * @return int Number of bytes handled
	 */
	public function saveTempFileChunk( $req, $buffer ) {
		wfDebugLog( 'fileupload', 'Received chunk of ' . strlen( $buffer ) . ' bytes' );
		$nbytes = fwrite( $this->mTmpHandle, $buffer );

		if ( $nbytes == strlen( $buffer ) ) {
			$this->mFileSize += $nbytes;
		} else {
			// Well... that's not good!
			wfDebugLog(
				'fileupload',
				'Short write ' . $this->nbytes . '/' . strlen( $buffer ) .
					' bytes, aborting with ' . $this->mFileSize . ' uploaded so far'
			);
			fclose( $this->mTmpHandle );
			$this->mTmpHandle = false;
		}

		return $nbytes;
	}

	/**
	 * Download the file, save it to the temporary file and update the file
	 * size and set $mRemoveTempFile to true.
	 *
	 * @return Status
	 */
	public function fetchFile() {
		global $wgCopyUploadProxy, $wgCopyUploadTimeout;
		if ( $this->mTempPath === false ) {
			return Status::newFatal( 'tmp-create-error' );
		}

		// Note the temporary file should already be created by makeTemporaryFile()
		$this->mTmpHandle = fopen( $this->mTempPath, 'wb' );
		if ( !$this->mTmpHandle ) {
			return Status::newFatal( 'tmp-create-error' );
		}
		wfDebugLog( 'fileupload', 'Temporary file created "' . $this->mTempPath . '"' );

		$this->mRemoveTempFile = true;
		$this->mFileSize = 0;

		$this->mRequest->setCallback( array( $this, 'saveTempFileChunk' ) );
		$status = $this->mRequest->execute();

		if ( $this->mTmpHandle ) {
			// File got written ok...
			fclose( $this->mTmpHandle );
			$this->mTmpHandle = null;
		} else {
			// We encountered a write error during the download...
			return Status::newFatal( 'tmp-write-error' );
		}

		wfDebugLog( 'fileupload', $status );
		if ( $status->isOk() ) {
			wfDebugLog( 'fileupload', 'Download from request completed successfuly.' );
		} else {
			wfDebugLog(
				'fileupload',
				'Download from request completed with HTTP status ' . $this->mRequest->getStatus()
			);
		}

		return $status;
	}
}
