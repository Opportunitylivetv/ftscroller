// Pointer Events are unprefixed in IE11

var _trackTouchEvents = (function trackTouchEvents() {
	return ('propertyIsEnumerable' in window ||
			'hasOwnProperty' in window.document) &&
			(window.propertyIsEnumerable('ontouchstart') ||
			window.document.hasOwnProperty('ontouchstart'));
}());

if ('pointerEnabled' in window.navigator) {
	module.exports = {
		supportsPointers:      true,
		trackTouchEvents:      _trackTouchEvents,
		pointerEventsPrefixed: false,
		trackPointerEvents:    window.navigator.pointerEnabled,
		setPointerCapture:     'setPointerCapture',
		releasePointerCapture: 'releasePointerCapture',
		lostPointerCapture:    'lostpointercapture',
		pointerTypeTouch:      'touch',
		pointerDownEvent:      'pointerdown',
		pointerMoveEvent:      'pointermove',
		pointerUpEvent:        'pointerup',
		pointerCancelEvent:    'pointercancel'
	};
} else if ('msPointerEnabled' in window.navigator) {
	module.exports = {
		supportsPointers:      true,
		trackTouchEvents:      _trackTouchEvents,
		pointerEventsPrefixed: true,
		trackPointerEvents:    window.navigator.msPointerEnabled,
		setPointerCapture:     'msSetPointerCapture',
		releasePointerCapture: 'msReleasePointerCapture',
		lostPointerCapture:    'MSLostPointerCapture',
		pointerTypeTouch:      2, // PointerEvent.MSPOINTER_TYPE_TOUCH = 2 in IE10
		pointerDownEvent:      'MSPointerDown',
		pointerMoveEvent:      'MSPointerMove',
		pointerUpEvent:        'MSPointerUp',
		pointerCancelEvent:    'MSPointerCancel'
	};
} else {
	module.exports = {
		supportsPointers:      false,
		trackTouchEvents:      _trackTouchEvents
	};
}
