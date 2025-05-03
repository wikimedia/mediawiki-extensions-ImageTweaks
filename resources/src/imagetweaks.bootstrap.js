( function ( mw, $ ) {
	const link = mw.util.addPortletLink(
		'p-tb',
		'#',
		mw.message( 'imagetweaks-editor-open' ),
		'imagetweaks-editor-open'
	);

	$( link ).on( 'click', ( e ) => {
		const modulePromise = mw.loader.using( 'ImageEditor' ),
			api = new mw.Api(),
			title = mw.Title.newFromText( mw.config.get( 'wgPageName' ) ),
			apiPromise = api.get( {
				action: 'query',
				prop: 'imageinfo',
				indexpageids: true,
				titles: title.getPrefixedText(),
				iiprop: 'url'
			} );

		$.when( modulePromise, apiPromise ).then( ( moduleArgs, apiArgs ) => {
			var result = apiArgs[ 0 ],
				extension = mw.Title.normalizeExtension( title.getExtension() || '' ),
				editor = new mw.ImageEditor( {
					imagePath: result.query.pages[ result.query.pageids[ 0 ] ].imageinfo[ 0 ].url,
					cb: function () {
						editor.getImage( extension );
					}
				} );

			$( 'body' ).append( editor.$element );
			editor.initialize();

			$( document ).on( 'keyup', ( e ) => {
				if ( e.keyCode === 27 && !( e.altKey || e.ctrlKey || e.shiftKey || e.metaKey ) ) {
					editor.close();
				}
			} );

			editor.on( 'save', () => {
				let i, action, args, right, bottom,
					actions = editor.actions,
					filters = [];

				for ( i = 0; i < actions.length; i++ ) {
					action = actions[ i ];
					args = action.action;

					switch ( action.name ) {
						case 'flipVertical':
							filters.push( 'flip(x)' );
							break;
						case 'flipHorizontal':
							filters.push( 'flip(y)' );
							break;
						case 'crop':
							right = Number( args.x ) + Number( args.width );
							bottom = Number( args.y ) + Number( args.height );
							filters.push( 'crop(' + [ args.x, args.y, right, bottom ].join( ',' ) + ')' );
							break;
						case 'rotateClockwise':
							filters.push( 'rotate(270)' );
							break;
						case 'rotateCounterClockwise':
							filters.push( 'rotate(90)' );
							break;
					}
				}

				api.get( {
					action: 'imagetweaks',
					itfile: title.getPrefixedText(),
					itdestfile: title.getNameText() + ' (edited - ' + Date.now() + ').' + extension,
					itfilters: filters.join( ':' ),
					itstash: true
				} ).done( ( result ) => {
					const dialog = new mw.Upload.Dialog( {
							booklet: {
								filekey: result.imagetweaks.filekey
							}
						} ),
						wm = new OO.ui.WindowManager();

					$( 'body' ).append( wm.$element );
					wm.addWindows( [ dialog ] );

					$( '#imageeditor-container' ).hide();

					wm.openWindow( dialog );
				} );
			} );
		} );
		e.preventDefault();
	} );
}( mediaWiki, jQuery ) );
