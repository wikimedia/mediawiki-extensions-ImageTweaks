( function ( $, OO, Caman, mw ) {

/**
 * @class mw.ImageEditor
 *
 * ImageEditor is a user interface that allows making edits to
 * images. It uses OO.ui.Toolbar and OO.ui.PanelLayout for the basic
 * UI, and Caman for image editing.
 *
 *     var e = new ImageEditor( {
 *         imagePath: 'cat.png'
 *     } );
 *     // Register any new tools here
 *     e.initialize();
 *
 * @cfg {string} imagePath Path of the image to load in the editor.
 */
mw.ImageEditor = function ( config ) {
	if ( config.imagePath === undefined ) {
		throw new Error( 'All config not passed' );
	}

	// Mixin constructors
	OO.EventEmitter.call( this );

	// Setup container
	this.$element = $( '<div>' ).attr( 'id', 'imageeditor-container' );
	this.$element
		.addClass( 'mwe-imageeditor-editor' )
		.append(
			$( '<div>' )
				.addClass( 'mwe-imageeditor-canvas-container' )
				.append(
					$( '<img>' )
						.attr( 'src', config.imagePath )
						.attr( 'id', 'mwe-imageeditor-image' )
				)
		);

	// Editor
	this.editor = new OO.ui.PanelLayout( {
		framed: true,
		padded: false
	} );
	this.$element.append( this.editor.$element );

	// Toolbar
	this.toolFactory = new OO.ui.ToolFactory();
	this.toolGroupFactory = new OO.ui.ToolGroupFactory();
	this.toolbar = new OO.ui.Toolbar( this.toolFactory, this.toolGroupFactory, {
		actions: true
	} );
	this.editor.$element.append( this.toolbar.$element );

	/**
	 * @private
	 * @property {Caman} image Caman image object
	 */
	this.image = Caman( '#mwe-imageeditor-image', config.cb || function () {} );

	/**
	 * @private
	 * @property {OO.ui.PanelLayout} interactivePanel The panel
	 * passed to interactive tools to render additional UI.
	 */
	this.interactivePanel = new OO.ui.PanelLayout( {
		expanded: false,
		framed: true,
		padded: true,
		classes: [ 'mwe-imageeditor-interactivepanel' ]
	} );
	this.interactivePanel.toggle( false );
	this.editor.$element.append( this.interactivePanel.$element );

	/**
	 * @private
	 * @property {Array} toolbarGroups The groups config passed to the
	 * [toolbar's
	 * setup](https://doc.wikimedia.org/oojs-ui/master/js/#!/api/OO.ui.Toolbar-method-setup)
	 * method.
	 */
	this.toolbarGroups = [
		{
			type: 'bar',
			include: [ 'undo', 'redo' ]
		},
		{
			type: 'bar',
			include: [ 'rotateCounterClockwise', 'rotateClockwise' ]
		},
		{
			type: 'bar',
			include: [ 'flipVertical', 'flipHorizontal' ]
		},
		{
			type: 'bar',
			include: [ 'crop' ]
		}
	];

	/**
	 * @private
	 * @property {Object} tools Instances of mw.ImageTools registered with the ImageEditor
	 */
	this.tools = {};

	/**
	 * @private
	 * @property {Array} actions Actions taken so far.
	 */
	this.actions = [];

	/**
	 * @private
	 * @property {number} currentAction Current action as an index
	 * of the {@link #property-actions} array.
	 */
	this.currentAction = undefined;

	/**
	 * @private
	 * @property {boolean} isUndoable Is the editor undoable?
	 */
	this.isUndoable = false;

	/**
	 * @private
	 * @property {boolean} isRedoable Is the editor redoable?
	 */
	this.isRedoable = false;

	/**
	 * @private
	 * @property {boolean} interactiveTool Is an interactive tool currently active?
	 */
	this.interactiveTool = false;
};

OO.initClass( mw.ImageEditor );
OO.mixinClass( mw.ImageEditor, OO.EventEmitter );

/**
 * @event save
 * Fired when the save button is clicked
 * @param {Uint8ClampedArray} imageData
 */

/**
 * Initializes the editor.
 */
mw.ImageEditor.prototype.initialize = function () {
	this.setupToolbar();

	// TODO Stuff about the editor's state
};

/**
 * Closes the editor.
 */
mw.ImageEditor.prototype.close = function () {
	this.cleanUpTools();
	this.$element.remove();
};

/**
 * Cleans up interface loaded by interactive tools
 */
mw.ImageEditor.prototype.cleanUpTools = function () {
	$.each( this.tools, function ( name, tool ) {
		if (
			tool.destroyInterface !== null &&
			tool.destroyInterface !== undefined
		) {
			tool.destroyInterface();
		}
	} );
};

/**
 * Getter method for current image in Base64.
 *
 * @param {string} type
 */
mw.ImageEditor.prototype.getImage = function ( type ) {
	// We're accepting file extensions, but Caman wants these
	// stupid pseudo-MIME types without prefices, so do idiotic
	// fudging.
	if ( type === 'jpg' ) {
		type = 'jpeg';
	}

	return this.image.toBase64( type );
};

/**
 * Setups up the toolbar.
 *
 * @private
 */
mw.ImageEditor.prototype.setupToolbar = function () {
	var editor =  this;

	this.registerCoreTools();
	this.setupUndoRedo();
	this.setupTools();

	// Setup toolbar
	this.toolbar.setup( this.getToolbarGroups() );

	this.saveButton = new OO.ui.ButtonWidget( {
		label: mw.message( 'imagetweaks-editor-save' ).text(),
		flags: [ 'progressive', 'primary' ]
	} ).on( 'click', function () {
		editor.emit( 'save' );
	} );

	// Refresh the undo redo states
	this.toolbar.emit( 'updateState' );

	this.toolbar.$actions.append( this.saveButton.$element );
};

/**
 * Setter method for {@link #property-toolbarGroups}.
 *
 * @param {Object} groups
 * @return {Object}
 */
mw.ImageEditor.prototype.setToolbarGroups = function ( groups ) {
	this.toolbarGroups = groups;
	return this.toolbarGroups;
};

/**
 * Getter method for {@link #property-toolbarGroups}.
 *
 * @return {Object}
 */
mw.ImageEditor.prototype.getToolbarGroups = function () {
	return this.toolbarGroups;
};

/**
 * Pushes to {@link #property-actions}, updates {@link
 * #property-currentAction}, and calls {@link #updateUndoRedoState}.
 *
 * @private
 * @param {string} name
 * @param {Object} action
 */
mw.ImageEditor.prototype.addAction = function ( name, action ) {
	// The current action is being made over the latest action
	if (
		this.currentAction === undefined ||
		this.currentAction === this.actions.length - 1
	) {
		this.actions.push( {
			name: name,
			action: action
		} );

		this.currentAction = this.actions.length - 1;
	} else {
		this.actions = this.actions.slice( 0, this.currentAction + 1 );
		this.actions.push( {
			name: name,
			action: action
		} );

		this.currentAction = this.actions.length - 1;
	}
	this.updateUndoRedoState();
};

/**
 * Updates the state of the undo and redo buttons based on
 * {@link #property-currentAction}.
 *
 * @private
 */
mw.ImageEditor.prototype.updateUndoRedoState = function () {
	this.isUndoable = ( this.currentAction >= 0 );
	this.isRedoable = ( this.currentAction !== this.actions.length - 1 );
	this.toolbar.emit( 'updateState' );
};

/**
 * Undos last action
 *
 * @private
 */
mw.ImageEditor.prototype.undo = function () {
	var lastAction = this.actions[ this.currentAction ];
	this.tools[ lastAction.name ].undoAction( this.image, lastAction.action );
	this.currentAction--;
	this.updateUndoRedoState();
};

/**
 * Redos last action
 *
 * @private
 */
mw.ImageEditor.prototype.redo = function () {
	var nextAction = this.actions[ this.currentAction + 1 ];
	this.tools[ nextAction.name ].doAction( this.image, nextAction.action );
	this.currentAction++;
	this.updateUndoRedoState();
};

/**
 * Sets up the undo and redo buttons in the toolbar
 *
 * @private
 */
mw.ImageEditor.prototype.setupUndoRedo = function () {
	var editor =  this;

	// Undo
	function UndoTool() {
		UndoTool.super.apply( this, arguments );
	}

	OO.inheritClass( UndoTool, OO.ui.Tool );

	UndoTool.static.name = 'undo';
	UndoTool.static.icon = 'undo';
	UndoTool.static.title = mw.message( 'imagetweaks-editor-undo' ).text();

	UndoTool.prototype.onSelect = function () {
		editor.undo();
		this.setActive( false );
	};

	UndoTool.prototype.onUpdateState = function () {
		if ( editor.isUndoable && !editor.getInteractiveTool() ) {
			this.setDisabled( false );
		} else {
			this.setDisabled( true );
		}
		this.setActive( false );
	};

	this.toolFactory.register( UndoTool );

	// Redo
	function RedoTool() {
		RedoTool.super.apply( this, arguments );
	}

	OO.inheritClass( RedoTool, OO.ui.Tool );

	RedoTool.static.name = 'redo';
	RedoTool.static.icon = 'redo';
	RedoTool.static.title = mw.message( 'imagetweaks-editor-redo' ).text();

	RedoTool.prototype.onSelect = function () {
		editor.redo();
		this.setActive( false );
	};

	RedoTool.prototype.onUpdateState = function () {
		if ( editor.isRedoable && !editor.getInteractiveTool() ) {
			this.setDisabled( false );
		} else {
			this.setDisabled( true );
		}
		this.setActive( false );
	};

	this.toolFactory.register( RedoTool );
};

/**
 * Setter method for {@link #property-interactiveTool}.
 *
 * @private
 * @param {boolean} value
 * @return {boolean}
 */
mw.ImageEditor.prototype.setInteractiveTool = function ( value ) {
	this.interactiveTool = value;
	this.interactivePanel.$element.empty();
	this.interactivePanel.toggle( value );
	this.toolbar.emit( 'updateState' );
	return this.interactiveTool;
};

/**
 * Getter method for {@link #property-interactiveTool}.
 *
 * @private
 * @return {boolean}
 */
mw.ImageEditor.prototype.getInteractiveTool = function () {
	return this.interactiveTool;
};

/**
 * Reads list of registered tools and sets them up with the toolbar.
 *
 * @private
 */
mw.ImageEditor.prototype.setupTools = function () {
	$.each( this.tools, function ( tool ) {
		this.setupTool( this.tools[ tool ] );
	}.bind( this ) );
};

/**
 * Sets up an instance of mw.ImageTool with the toolbar.
 *
 * @private
 */
mw.ImageEditor.prototype.setupTool = function ( tool ) {
	var editor = this;

	function Tool() {
		Tool.super.apply( this, arguments );
	}
	OO.inheritClass( Tool, OO.ui.Tool );

	Tool.static.name = tool.name;
	Tool.static.icon = tool.icon;
	Tool.static.title = tool.title;

	Tool.prototype.onSelect = function () {
		var action, then, now;
		if ( tool.isInteractive ) {
			editor.setInteractiveTool( true );
			tool.getAction( editor.image, editor.interactivePanel )
				.done( function ( action ) {
					editor.addAction( tool.name, action );
				} ).always( function () {
					editor.setInteractiveTool( false );
				} );

		} else {
			then = new Date();
			action = tool.doAction( editor.image );
			now = new Date();
			editor.addAction( tool.name, action );
		}

		this.setActive( false );
	};

	Tool.prototype.onUpdateState = function () {
		if ( editor.getInteractiveTool() ) {
			this.setDisabled( true );
		} else {
			this.setDisabled( false );
		}
		this.setActive( false );
	};

	this.toolFactory.register( Tool );
};

/**
 * Register an mw.ImageTool with the editor
 */
mw.ImageEditor.prototype.registerTool = function ( tool ) {
	this.tools[ tool.name ] = tool;
};

/**
 * Instantiate and register core tools with the editor
 *
 * @private
 */
mw.ImageEditor.prototype.registerCoreTools = function () {
	var rotateCounterClockwise, rotateClockwise, flipVertical, flipHorizontal, crop;

	rotateCounterClockwise = new mw.ImageTool( {
		name: 'rotateCounterClockwise',
		icon: 'rotate-counter-clockwise',
		title: mw.message( 'imagetweaks-editor-rotate-cc' ).text()
	} );
	rotateCounterClockwise.doAction = function ( image ) {
		image.rotate( -90 );
		image.render();
		return {};
	};
	rotateCounterClockwise.undoAction = function ( image ) {
		image.rotate( 90 );
		image.render();
	};
	this.registerTool( rotateCounterClockwise );

	rotateClockwise = new mw.ImageTool( {
		name: 'rotateClockwise',
		icon: 'rotate-clockwise',
		title: mw.message( 'imagetweaks-editor-rotate-c' ).text()
	} );
	rotateClockwise.doAction = function ( image ) {
		image.rotate( 90 );
		image.render();
		return {};
	};
	rotateClockwise.undoAction = function ( image ) {
		image.rotate( -90 );
		image.render();
	};
	this.registerTool( rotateClockwise );

	flipVertical = new mw.ImageTool( {
		name: 'flipVertical',
		icon: 'flip-vertical',
		title: mw.message( 'imagetweaks-editor-flip-v' ).text()
	} );
	flipVertical.doAction = function ( image ) {
		image.flip( 'y' );
		image.render();
		return {};
	};
	flipVertical.undoAction = function ( image ) {
		image.flip( 'y' );
		image.render();
	};
	this.registerTool( flipVertical );

	flipHorizontal = new mw.ImageTool( {
		name: 'flipHorizontal',
		icon: 'flip-horizontal',
		title: mw.message( 'imagetweaks-editor-flip-h' ).text()
	} );
	flipHorizontal.doAction = function ( image ) {
		image.flip( 'x' );
		image.render();
		return {};
	};
	flipHorizontal.undoAction = function ( image ) {
		image.flip( 'x' );
		image.render();
	};
	this.registerTool( flipHorizontal );

	crop = new mw.ImageTool( {
		name: 'crop',
		icon: 'crop',
		title: mw.message( 'imagetweaks-editor-crop' ).text(),
		isInteractive: true
	} );

	crop.setupInterface = function ( image, panel ) {
		var controls;

		this.widthInput = new OO.ui.TextInputWidget( { disabled: true } );
		this.heightInput = new OO.ui.TextInputWidget( { disabled: true } );
		this.xInput = new OO.ui.TextInputWidget( { disabled: true } );
		this.yInput = new OO.ui.TextInputWidget( { disabled: true } );
		this.crop = new OO.ui.ButtonWidget( {
			label: mw.message( 'imagetweaks-editor-crop' ).text(),
			flags: [ 'primary', 'progressive' ]
		} );
		this.cancel = new OO.ui.ButtonWidget( {
			label: mw.message( 'imagetweaks-editor-cancel' ).text(),
			flags: [ 'destructive' ]
		} );

		this.crop.on( 'click', function () {
			var now, then, action = {
				width: this.widthInput.getValue(),
				height: this.heightInput.getValue(),
				x: this.xInput.getValue(),
				y: this.yInput.getValue()
			};
			action.oldImageData = image.imageData;

			then = new Date();
			this.doAction( image, action );
			now = new Date();

			this.deferred.resolve( action );

			this.$cover.remove();
		}.bind( this ) );

		this.cancel.on( 'click', this.destroyInterface.bind( this ) );

		controls = new OO.ui.HorizontalLayout( {
			items: [
				this.widthInput,
				this.heightInput,
				this.xInput,
				this.yInput,
				this.crop,
				this.cancel
			]
		} );
		panel.$element.append( controls.$element );

		this.drawCropTool( image );
	};

	crop.destroyInterface = function () {
		this.$cover.remove();
		this.deferred.reject();
	};

	crop.drawCropTool = function ( image ) {
		this.$canvas = $( image.canvas );
		this.xRatio = this.$canvas[ 0 ].width / ( this.$canvas.width() * 1.0 );
		this.yRatio = this.$canvas[ 0 ].height / ( this.$canvas.height() * 1.0 );

		// Gray out the image
		this.$cover = $( '<div>' )
			.addClass( 'crop-cover' )
			.appendTo( 'body' )
			.css( {
				top: this.$canvas.offset().top,
				left: this.$canvas.offset().left,
				width: this.$canvas.width(),
				height: this.$canvas.height()
			} );

		// Canvas clone
		this.$canvasClone = this.$canvas.clone().attr( 'id', '' );
		this.$canvasClone.appendTo( this.$cover );
		this.$canvasClone[ 0 ].getContext( '2d' ).putImageData( image.imageData, 0, 0 );

		// Cropping rectangle
		this.$cropRect = $( '<div>' )
			.addClass( 'crop-rect' )
			.appendTo( this.$cover );
		this.$cropRect
			.resizable( {
				handles: 'all',
				containment: 'parent'
			} )
			.draggable( {
				containment: 'parent'
			} );

		// Use cropping rectanble bounds to show part of
		// the image and update text boxes
		this.$cropRect.on( 'drag resize', function () {
			this.translateCropToCanvas();
		}.bind( this ) );
		this.translateCropToCanvas();
	};

	crop.translateCropToCanvas = function () {
		var
			pos = this.$cropRect.position(),
			left = pos.left,
			top = pos.top,
			width = parseFloat( this.$cropRect.css( 'width' ) ),
			height = parseFloat( this.$cropRect.css( 'height' ) ),
			polygonPoints = left + 'px ' + // Top left
				top + 'px, ' +
				// Top Right
				( left + width ) + 'px ' +
				top  + 'px, ' +
				// Bottom Right
				( left + width ) + 'px ' +
				( top + height )  + 'px, ' +
				// Bottom Left
				left + 'px ' +
				( top + height )  + 'px';

		// Clip cloned canvas
		this.$canvasClone.css( '-webkit-clip-path',  'polygon(' + polygonPoints + ' )' );

		// Update inputs with crop values
		this.widthInput.setValue( width * this.xRatio );
		this.heightInput.setValue( height * this.yRatio );
		this.xInput.setValue( left * this.xRatio );
		this.yInput.setValue( top * this.yRatio );
	};

	crop.doAction = function ( image, action ) {
		image.crop( action.width, action.height, action.x, action.y );
		image.render();
		return action;
	};

	crop.undoAction = function ( image, action ) {
		var canvas = document.createElement( 'canvas' );
		canvas.height = action.oldImageData.height;
		canvas.width = action.oldImageData.width;
		canvas.getContext( '2d' ).putImageData(	action.oldImageData, 0, 0 );
		image.replaceCanvas( canvas );
	};

	this.registerTool( crop );

};

}( jQuery, OO, Caman, mediaWiki ) );
