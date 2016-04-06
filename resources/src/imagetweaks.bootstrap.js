( function ( mw, $ ) {
	var link = mw.util.addPortletLink(
		'p-tb',
		'#',
		mw.message( 'imagetweaks-editor-open' ),
		'imagetweaks-editor-open'
	);

	$( link ).on( 'click', function ( e ) {
		var origBase64, modulePromise = mw.loader.using( 'ImageEditor' ),
			api = new mw.Api(),
			title = mw.Title.newFromText( mw.config.get( 'wgPageName' ) ),
			apiPromise = api.get( {
				action: 'query',
				prop: 'imageinfo',
				indexpageids: true,
				titles: title.getPrefixedText(),
				iiprop: 'url'
			} );

		$.when( modulePromise, apiPromise ).then( function ( moduleArgs, apiArgs ) {
			var result = apiArgs[0],
				dotExtension = title.getDotExtension(),
				extension = mw.Title.normalizeExtension( dotExtension.replace( /^\./, '' ) ),
				editor = new mw.ImageEditor( {
					imagePath: result.query.pages[result.query.pageids[0]].imageinfo[0].url,
					cb: function () {
						origBase64 = editor.getImage( extension );
					}
				} );

			$( 'body' ).append( editor.$element );
			editor.initialize();

			$( document ).on( 'keyup', function ( e ) {
				if ( e.keyCode === 27 && !( e.altKey || e.ctrlKey || e.shiftKey || e.metaKey ) ) {
					editor.close();
				}
			} );

			editor.on( 'save', function () {
				var i, action, args, right, bottom,
					actions = editor.actions,
					filters = [];

				for ( i = 0; i < actions.length; i++ ) {
					action = actions[i];
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
							filters.push( 'crop(' + [ args.x , args.y, right, bottom ].join( ',' ) + ')' );
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
					itfilters: filters.join( ':' )
				} ).done( function ( result ) {
					var rtitle = mw.Title.newFromText( result.imagetweaks.filename, 6 );
					window.location = rtitle.getUrl();
				} );
			} );
		} );
		e.preventDefault();
	} );
}( mediaWiki, jQuery ) );
