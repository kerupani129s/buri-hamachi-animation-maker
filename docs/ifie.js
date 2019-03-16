window.addEventListener('DOMContentLoaded', function () {

	const userAgent = window.navigator.userAgent.toLowerCase();

	if ( userAgent.indexOf('msie') !== -1 || userAgent.indexOf('trident') !== -1 ) {
		document.body.insertAdjacentHTML('afterbegin', '<div style="position: fixed; width: calc(100% - (2px + 5px) * 2); margin: 2px; padding: 5px; background-color: #fff0f0; color: #ff0000;">※ IE は非対応です</div>');
	}

});
