
var pointerEvents = require('./pointerevents');

/** Interaction handlers (actually handles events from the browser and
 *  delegates to Scroller
 */
function ScrollInteractions(interactionHandlers, instanceOptions) {

	this._inputIdentifier = false;
	this._inputIndex = 0;
	this._inputCaptured = false;
	this._preventClick = false;

	this._startInteraction = interactionHandlers.start || function() {};
	this._updateInteraction = interactionHandlers.update || function() {};
	this._endInteraction = interactionHandlers.end || function() {};
	this._finaliseInteraction = interactionHandlers.finalise || function() {};
	this._stopInteraction = interactionHandlers.stop || function() {};

	this._cumulativeScroll = { x: 0, y: 0 };
	this._gestureStart     = { x: 0, y: 0, t: 0 };

	this._scrollWheelEndDebouncer = false;

	this._containerNode = document.body;
	this._instanceOptions = instanceOptions || {};
}

ScrollInteractions.prototype.setInputIdentifier = function(value) {
	this._inputIdentifier = value;
};

ScrollInteractions.prototype.getInputIdentifier = function() {
	return this._inputIdentifier;
};

ScrollInteractions.prototype.preventClick = function(value) {
	this._preventClick = value;
};

ScrollInteractions.prototype.setContainerNode = function setContainerNode(container) {
	this._containerNode = container;
};

/**
 * Touch event handlers
 */
ScrollInteractions.prototype._onTouchStart = function _onTouchStart(startEvent) {
	var i, l, touchEvent;

	// If a touch is already active, ensure that the index
	// is mapped to the correct finger, and return.
	if (this._inputIdentifier) {
		for (i = 0, l = startEvent.touches.length; i < l; i = i + 1) {
			if (startEvent.touches[i].identifier === this._inputIdentifier) {
				this._inputIndex = i;
			}
		}
		return;
	}

	// Track the new touch's identifier, reset index, and pass
	// the coordinates to the scroll start function.
	touchEvent = startEvent.touches[0];
	this._inputIdentifier = touchEvent.identifier;
	this._inputIndex = 0;
	this._startInteraction(touchEvent.clientX, touchEvent.clientY, startEvent.timeStamp, startEvent);
};

ScrollInteractions.prototype._onTouchMove = function _onTouchMove(moveEvent) {
	if (this._inputIdentifier === false) {
		return;
	}

	// Get the coordinates from the appropriate touch event and
	// pass them on to the scroll handler
	var touchEvent = moveEvent.touches[this._inputIndex];
	this._updateInteraction(touchEvent.clientX, touchEvent.clientY, moveEvent.timeStamp, moveEvent);
};

ScrollInteractions.prototype._onTouchEnd = function _onTouchEnd(endEvent) {
	var i, l;

	// Check whether the original touch event is still active,
	// if it is, update the index and return.
	if (endEvent.touches) {
		for (i = 0, l = endEvent.touches.length; i < l; i = i + 1) {
			if (endEvent.touches[i].identifier === this._inputIdentifier) {
				this._inputIndex = i;
				return;
			}
		}
	}

	// Complete the scroll.  Note that touch end events
	// don't capture coordinates.
	this._endInteraction(endEvent.timeStamp, endEvent);
};

/**
 * Mouse event handlers
 */
ScrollInteractions.prototype._onMouseDown = function _onMouseDown(startEvent) {

	// Don't track the right mouse buttons, or a context menu
	if ((startEvent.button && startEvent.button === 2) || startEvent.ctrlKey) {
		return;
	}

	// Capture if possible
	if (this._containerNode.setCapture) {
		this._containerNode.setCapture();
	}

	// Add move & up handlers to the *document* to allow handling outside the element
	document.addEventListener('mousemove', this._onMouseMove.bind(this), true);
	document.addEventListener('mouseup', this._onMouseUp.bind(this), true);

	this._inputIdentifier = startEvent.button || 1;
	this._inputIndex = 0;
	this._startInteraction(startEvent.clientX, startEvent.clientY, startEvent.timeStamp, startEvent);
};

ScrollInteractions.prototype._onMouseMove = function _onMouseMove(moveEvent) {
	if (!this._inputIdentifier) {
		return;
	}

	this._updateInteraction(moveEvent.clientX, moveEvent.clientY, moveEvent.timeStamp, moveEvent);
};

ScrollInteractions.prototype._onMouseUp = function _onMouseUp(endEvent) {
	if (endEvent.button && endEvent.button !== this._inputIdentifier) {
		return;
	}

	document.removeEventListener('mousemove', this._onMouseMove.bind(this), true);
	document.removeEventListener('mouseup', this._onMouseUp.bind(this), true);

	// Release capture if possible
	if (this._containerNode.releaseCapture) {
		this._containerNode.releaseCapture();
	}

	this._endInteraction(endEvent.timeStamp, endEvent);
};

/**
 * Pointer event handlers
 */
ScrollInteractions.prototype._onPointerDown = function _onPointerDown(startEvent) {

	// If there is already a pointer event being tracked, ignore subsequent.
	if (this._inputIdentifier) {
		return;
	}

	// Disable specific input types if specified in the config.  Separate
	// out touch and other events (eg treat both pen and mouse as "mouse")
	if (startEvent.pointerType === startEvent.MSPOINTER_TYPE_TOUCH) {
		if (this._instanceOptions.disabledInputMethods.touch) {
			return;
		}
	} else if (this._instanceOptions.disabledInputMethods.mouse) {
		return;
	}

	this._inputIdentifier = startEvent.pointerId;
	this._startInteraction(startEvent.clientX, startEvent.clientY, startEvent.timeStamp, startEvent);
};
ScrollInteractions.prototype._onPointerMove = function _onPointerMove(moveEvent) {
	if (this._inputIdentifier !== moveEvent.pointerId) {
		return;
	}
	this._updateInteraction(moveEvent.clientX, moveEvent.clientY, moveEvent.timeStamp, moveEvent);
};
ScrollInteractions.prototype._onPointerUp = function _onPointerUp(endEvent) {
	if (this._inputIdentifier !== endEvent.pointerId) {
		return;
	}

	this._endInteraction(endEvent.timeStamp, endEvent);
};
ScrollInteractions.prototype._onPointerCancel = function _onPointerCancel(endEvent) {
	this._endInteraction(endEvent.timeStamp, endEvent);
};
ScrollInteractions.prototype._onPointerCaptureEnd = function _onPointerCaptureEnd(event) {

	// On pointer capture end - which can happen because of another element
	// releasing pointer capture - don't end scrolling, but do track that
	// input capture has been lost.  This will result in pointers leaving
	// the window possibly being lost, but further interactions will fix
	// the tracking again.
	this._inputCaptured = false;
};


/**
 * Prevents click actions if appropriate
 */
ScrollInteractions.prototype._onClick = function _onClick(clickEvent) {

	// If a scroll action hasn't resulted in the next scroll being prevented, and a scroll
	// isn't currently in progress with a different identifier, allow the click
	if (!this._preventClick && !this._inputIdentifier) {
		return true;
	}

	// Prevent clicks using the preventDefault() and stopPropagation() handlers on the event;
	// this is safe even in IE10 as this is always a "true" event, never a window.event.
	clickEvent.preventDefault();
	clickEvent.stopPropagation();
	if (!this._inputIdentifier) {
		this._preventClick = false;
	}
	return false;
};


/**
 * Process scroll wheel/input actions as scroller scrolls
 */
ScrollInteractions.prototype._onMouseScroll = function _onMouseScroll(event) {
	var scrollDeltaX, scrollDeltaY;

	if (this._inputIdentifier !== 'scrollwheel') {
		if (this._inputIdentifier !== false) {
			return true;
		}
		this._inputIdentifier = 'scrollwheel';
		this._cumulativeScroll.x = 0;
		this._cumulativeScroll.y = 0;

		// Start a scroll event
		if (!this._startInteraction(event.clientX, event.clientY, Date.now(), event)) {
			return;
		}
	}

	// Convert the scrollwheel values to a scroll value
	if (event.wheelDelta) {
		if (event.wheelDeltaX) {
			scrollDeltaX = event.wheelDeltaX / 2;
			scrollDeltaY = event.wheelDeltaY / 2;
		} else {
			scrollDeltaX = 0;
			scrollDeltaY = event.wheelDelta / 2;
		}
	} else {
		if (event.axis && event.axis === event.HORIZONTAL_AXIS) {
			scrollDeltaX = event.detail * -10;
			scrollDeltaY = 0;
		} else {
			scrollDeltaX = 0;
			scrollDeltaY = event.detail * -10;
		}
	}

	// If the scroller is constrained to an x axis, convert y scroll to allow single-axis scroll
	// wheels to scroll constrained content.
	if (!this._instanceOptions.scrollingY && !scrollDeltaX) {
		scrollDeltaX = scrollDeltaY;
		scrollDeltaY = 0;
	}

	this._cumulativeScroll.x = Math.round(this._cumulativeScroll.x + scrollDeltaX);
	this._cumulativeScroll.y = Math.round(this._cumulativeScroll.y + scrollDeltaY);

	this._updateInteraction(this._gestureStart.x + this._cumulativeScroll.x, this._gestureStart.y + this._cumulativeScroll.y, event.timeStamp, event);

	// End scrolling state
	if (this._scrollWheelEndDebouncer) {
		clearTimeout(this._scrollWheelEndDebouncer);
	}
	this._scrollWheelEndDebouncer = setTimeout(function () {
		this._releaseInputCapture();
		this._inputIdentifier = false;
		this._stopInteraction();
	}.bind(this), 300);
};

/**
 * Capture and release input support, particularly allowing tracking
 * of Metro pointers outside the docked view.  Note that _releaseInputCapture
 * should be called before the input identifier is cleared.
 */
ScrollInteractions.prototype._captureInput = function _captureInput() {
	if (this._inputCaptured || this._inputIdentifier === false || this._inputIdentifier === 'scrollwheel') {
		return;
	}
	if (pointerEvents.trackPointerEvents) {
		this._containerNode[pointerEvents.setPointerCapture](this._inputIdentifier);
		this._containerNode.addEventListener(pointerEvents.lostPointerCapture, this._onPointerCaptureEnd.bind(this), false);
	}
	this._inputCaptured = true;
};

ScrollInteractions.prototype._releaseInputCapture = function _releaseInputCapture() {
	if (!this._inputCaptured) {
		return;
	}
	if (pointerEvents.trackPointerEvents) {
		this._containerNode.removeEventListener(pointerEvents.lostPointerCapture, this._onPointerCaptureEnd.bind(this), false);
		this._containerNode[pointerEvents.releasePointerCapture](this._inputIdentifier);
	}
	this._inputCaptured = false;
};

module.exports = ScrollInteractions;
