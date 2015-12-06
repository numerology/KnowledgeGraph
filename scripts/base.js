/* Init collapse in base.html
Intended for other common components in base.html*/

//Init backTop
$('#backTop').backTop({
    'position': 400, // min distance scrolled before btn is shown
    'speed': 800, // animation speed, not scroll speed ...
    'color': 'blue', // configured for light steel blue
    'duration': 800, // total time of scrolling
});

$('.collapse').collapse("toggle");
