// Pointer Events are unprefixed in IE11
if ('pointerEnabled' in window.navigator) {
	module.exports = {
		supportsPointers:      true,
		pointerEventsPrefixed: false,
		trackPointerEvents:    window.navigator.pointerEnabled,
		setPointerCapture:     'setPointerCapture',
		releasePointerCapture: 'releasePointerCapture',
		lostPointerCapture:    'lostpointercapture',
		pointerTypeTouch:      'touch'
	};
} else if ('msPointerEnabled' in window.navigator) {
	module.exports = {
		supportsPointers:      true,
		pointerEventsPrefixed: true,
		trackPointerEvents:    window.navigator.msPointerEnabled,
		setPointerCapture:     'msSetPointerCapture',
		releasePointerCapture: 'msReleasePointerCapture',
		lostPointerCapture:    'MSLostPointerCapture',
		pointerTypeTouch:      2 // PointerEvent.MSPOINTER_TYPE_TOUCH = 2 in IE10
	};
} else {
	module.exports = {
		supportsPointers:      false,
	};
}
