/*
 * Lazy Load - for lazy loading images without jQuery
 */

LazyLoad = function (instanceSettings) {

	var _defaultSettings = {
			elements_selector: "img:not(.processed)",
			container: window,
			threshold: 0,
			src_data_attribute: "original",
			processed_class: "processed",
			loading_class: "loading",
			loaded_class: "loaded",
			skip_invisible: true,
			show_while_loading: false,
			load_callback: null,
			set_callback: null,
			processed_callback: null,
			placeholder: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
		},
		_supportsAddEventListener = !!window.addEventListener,
		_supportsAttachEvent = !!window.attachEvent,
		_supportsClassList = !!document.body.classList;

	/*
	 * PRIVATE FUNCTIONS *NOT RELATED* TO A SPECIFIC INSTANCE OF LAZY LOAD
	 * -------------------------------------------------------------------
	 */

	function _addEventListener(element, eventName, callback) {
		// Use addEventListener if available
		if (_supportsAddEventListener) {
			element.addEventListener(eventName, callback);
			return;
		}
		// Otherwise use attachEvent, set this and event
		if (_supportsAttachEvent) {
			element.attachEvent('on' + eventName, (function (el) {
				return function () {
					callback.call(el, window.event);
				};
			}(element)));
			// Break closure and primary circular reference to element
			element = null;
		}
	}

	function _removeEventListener(element, eventName, callback) {
		// Use removeEventListener if available
		if (_supportsAddEventListener) {
			element.removeEventListener(eventName, callback);
			return;
		}
		// Otherwise use detachEvent
		if (_supportsAttachEvent) {
			element.detachEvent('on' + eventName, callback);
		}
	}

	function _isInsideViewport(element, container, threshold) {

		var ownerDocument, documentTop, documentLeft;

		function _getDocumentWidth() {
			return window.innerWidth || (ownerDocument.documentElement.clientWidth || document.body.clientWidth);
		}

		function _getDocumentHeight() {
			return window.innerHeight || (ownerDocument.documentElement.clientHeight || document.body.clientHeight);
		}

		function _getTopOffset(element) {
			return element.getBoundingClientRect().top + documentTop - ownerDocument.documentElement.clientTop;
		}

		function _getLeftOffset(element) {
			return element.getBoundingClientRect().left + documentLeft - ownerDocument.documentElement.clientLeft;
		}

		function _isBelowViewport() {
			var fold;
			if (container === window) {
				fold = _getDocumentHeight() + documentTop;
			} else {
				fold = _getTopOffset(container) + container.offsetHeight;
			}
			return fold <= _getTopOffset(element) - threshold;
		}

		function _isAtRightOfViewport() {
			var fold;
			if (container === window) {
				fold = _getDocumentWidth() + window.pageXOffset;
			} else {
				fold = _getLeftOffset(container) + _getDocumentWidth();
			}
			return fold <= _getLeftOffset(element) - threshold;
		}

		function _isAboveViewport() {
			var fold;
			if (container === window) {
				fold = documentTop;
			} else {
				fold = _getTopOffset(container);
			}
			return fold >= _getTopOffset(element) + threshold + element.offsetHeight;
		}

		function _isAtLeftOfViewport() {
			var fold;
			if (container === window) {
				fold = documentLeft;
			} else {
				fold = _getLeftOffset(container);
			}
			return fold >= _getLeftOffset(element) + threshold + element.offsetWidth;
		}

		ownerDocument = element.ownerDocument;
		documentTop = window.pageYOffset || ownerDocument.body.scrollTop;
		documentLeft = window.pageXOffset || ownerDocument.body.scrollLeft;

		return !_isBelowViewport() && !_isAboveViewport() && !_isAtRightOfViewport() && !_isAtLeftOfViewport();
	}

	function _merge_objects(obj1, obj2) {
		var obj3 = {}, propertyName;
		for (propertyName in obj1) {
			if (obj1.hasOwnProperty(propertyName)) {
				obj3[propertyName] = obj1[propertyName];
			}
		}
		for (propertyName in obj2) {
			if (obj2.hasOwnProperty(propertyName)) {
				obj3[propertyName] = obj2[propertyName];
			}
		}
		return obj3;
	}

	function _getSrc(element, dataAttribute, placeholder) {
		var dataAttributeContent;
		dataAttributeContent = element.getAttribute(dataAttribute);
		return dataAttributeContent || placeholder;
	}

	function _addClass(element, className) {
		/* HTML 5 compliant browsers. */
		if (_supportsClassList) {
			element.classList.add(className);
			return;
		}
		/* Legacy browsers (IE<10) support. */
		element.className += (element.className ? ' ' : '') + className;
	}

	function _removeClass(element, className) {
		/* HTML 5 compliant browsers. */
		if (_supportsClassList) {
			element.classList.remove(className);
			return;
		}
		/* Legacy browsers (IE<10) support. */
		element.className = element.className.replace(new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').replace(/^\s+/, '').replace(/\s+$/, '');
	}

	/*
	 * PRIVATE FUNCTIONS *RELATED* TO A SPECIFIC INSTANCE OF LAZY LOAD
	 * ---------------------------------------------------------------
	 */

	this._setImageAndDisplay = function (element) {
		var settings = this._settings,
			src = _getSrc(element, 'data-' + settings.src_data_attribute, settings.placeholder);

		/* Setting `src` in the original `img` */
		if (element.nodeName.toLowerCase() === "img") {
			element.setAttribute("src", src);
		} else {
			element.style.backgroundImage = "url('" + src + "')";
		}
		if (settings.set_callback) {
			settings.set_callback(element);
		}
	};

	this._showOnLoad = function (element) {
		var fakeImg,
			settings = this._settings,
			setImageAndDisplay = this._setImageAndDisplay;

		/* If no src attribute given use data:uri. */
		if (!element.getAttribute("src")) {
			element.setAttribute("src", settings.placeholder);
		}
		/* Creating a new `img` in a DOM fragment. */
		fakeImg = document.createElement('img');
		/* Listening to the load event */
		function loadCallback() {
			setImageAndDisplay(element);
			if (settings.load_callback) {
				settings.load_callback(element);
			}
			_removeClass(element, settings.loading_class);
			_addClass(element, settings.loaded_class);
			_removeEventListener(fakeImg, "load", loadCallback);
		}

		_addEventListener(fakeImg, "load", loadCallback);
		_addClass(element, settings.loading_class);
		/* Setting the source in the fake image */
		fakeImg.setAttribute("src", _getSrc(element));
	};

	this._showOnAppear = function (element) {
		var settings = this._settings;

		function loadCallback() {
			if (settings.load_callback) {
				settings.load_callback(element);
			}
			_removeClass(element, settings.loading_class);
			_addClass(element, settings.loaded_class);
			_removeEventListener(element, "load", loadCallback);
		}

		_addEventListener(element, "load", loadCallback);
		_addClass(element, settings.loading_class);
		this._setImageAndDisplay(element);
	};

	this._processImage = function (element) {
		var settings = this._settings;

		/* Forking behaviour depending on show_while_loading (true value is ideal for progressive jpeg). */
		if (settings.show_while_loading) {
			this._showOnAppear(element);
		} else {
			this._showOnLoad(element);
		}
		/* Setting element as processed */
		_addClass(element, settings.processed_class);
	};

	this._loopThroughElements = function () {
		var i, l, settings, elements, element;

		settings = this._settings;
		elements = this._elements;
		l = elements.length;
		for (i = 0; i < l; i++) {
			element = elements[i];
			/* If must skip_invisible and element is invisible, go to the next iteration */
			if (settings.skip_invisible && (element.offsetParent === null)) {
				continue;
			}
			if (_isInsideViewport(element, settings.container, settings.threshold)) {
				this._processImage(element);
				this._loadElements();
				/* Calling the processed class */
				if (settings.processed_callback) {
					settings.processed_callback(this._elements.length);
				}
			}
		}
	};

	this._loadElements = function () {
		/* TODO: This breaks on IE8 because default selector has :not(.processed) which is not supported */
		this._elements = this._queryOriginNode.querySelectorAll(this._settings.elements_selector);
	};

	/*
	 * PUBLIC FUNCTIONS
	 * ----------------
	 */

	this.update = function () {
		this._loadElements();
		this._loopThroughElements();
	};

	/*
	 * INITIALIZER
	 * -----------
	 */

	this._settings = _merge_objects(_defaultSettings, instanceSettings);
	this._queryOriginNode = this._settings.container === window ? document : this._settings.container;
	_addEventListener(this._settings.container, "scroll", (function (_this) {
		return function () {
			_this._loopThroughElements();
		};
	})(this));
	this.update();

};