# BackTop [![Build Status](https://travis-ci.org/markgoodyear/scrollup.svg?branch=master)](https://travis-ci.org/markgoodyear/scrollup) [![devDependency Status](https://david-dm.org/markgoodyear/scrollup/dev-status.svg)](https://david-dm.org/markgoodyear/scrollup#info=devDependencies)
> A jQuery plugin to create a customisable 'Back to Top' feature for integration with any website.

## Installing with Bower

To install backTop with Bower:

```bash
bower install backTop
```

## How to use

- Include ``` <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js"></script>``` just before the ```</body>``` tag

- Include ``` <script src="PATH TO YOUR JS DIRECTORY/jquery.backTop.js"></script> ``` after the jquery include.

- Include ``` <a id='backTop'>Back To Top</a> ``` within your html ``` <body></body> ``` tag

- Include ``` <link href="css/backTop.css" rel="stylesheet" type="text/css" /> ``` before the ``` </head> ``` tag.

### Minimum setup

```js
$(document).ready( function() {
	$('#backTop').backTop();
});
```

**Example with default options**

```js
$(document).ready( function() {
	$('#backTop').backTop({
		'position' : 400,
		'speed' : 500,
		'color' : 'red',
	});
});
```

### Position

To set a position of the Scroll Top Icon top appear when the browser scroll reaches at the specified position. Default position is 400px from the Top.


### Speed

To specify the animation speed of the Scroll Top Icon to appear when the page reaches the scroll position.

### Color

To specify the color of the Scroll Top Icon from the 4 (Four) predefined colors. - black, white, red, green


## Contributing

Please see [CONTRIBUTE.md](CONTRIBUTE.md) for info on contributing.


## Demo

<a href="http://codesalsa.net/backTop" target="_blank">Check out the demo</a> for more style and feature examples.
