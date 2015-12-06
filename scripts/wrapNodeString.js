//This file contain the function to wrap string for node in d3

//YW: used to place tspan and measure text width
var helperTspan = d3.select(".helper").append("div")
                  .append("svg").attr({"height": 100, "width": 100})
                  .append("g").attr("class","node").append("text").append("tspan");

function wrap(text, width) { // function copied from bl.ocks.org/mbostock/7555321
    //TODO: apply this to all node text
    var MAX_LINE_NUM = 3; // allow most 3 lines
    var MAX_WORD_WIDTH = 0.9*width; // max width of a word
    var TRIMMED_WORD_LENGTH = 8; // length of word for trimed word, point inclued in length "FOO."
    text.each(function(){
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1,
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan")
                        .attr("x", 50)
                        .attr("text-anchor", "middle")
                        .attr("y", y)
                        .attr("dy", dy + "em"),
            dy_set = [dy];
        helperTspan.text(tspan.node().textContent);
        //console.log("words: "+words);
        while (word = words.pop()) {
            helperTspan.text(word);
            if (helperTspan.node().getComputedTextLength()> MAX_WORD_WIDTH){
                word = trimString(word, TRIMMED_WORD_LENGTH, ".");
            }
            line.push(word);
            tspan.text(line.join(" "));
            helperTspan.text(tspan.node().textContent);
            //console.log(tspan);
            //console.log(tspan.node());
            //console.log(tspan.node().textContent);
            //console.log("span width: "+helperTspan.node().getComputedTextLength());
            if (helperTspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                lineNumber++;
                if (lineNumber == MAX_LINE_NUM){
                   tspan.text(trimString(line.join(" ")+"...", 8, "..."));
                   lineNumber--;
                   break;
                }
                line = [word];
                tspan = text.append("tspan").attr("x", 50).attr("y", y).attr("text-anchor", "middle")
                            .attr("dy", lineNumber*lineHeight + dy + "em").text(word);
                helperTspan.text(tspan.node().textContent);
                dy_set.push(parseFloat(tspan.attr("dy")));
            }
        }
        //console.log("dy set: "+ dy_set);
        var dy_offset = - (dy_set[dy_set.length-1] - dy_set[0])/2;
        //console.log(dy_offset);
        d3.select(this).selectAll("tspan").each(function(){
            var my_dy = parseFloat(d3.select(this).attr("dy"));
            //console.log(my_dy);
            d3.select(this).attr("dy", my_dy + dy_offset + "em");
            //console.log(my_dy + dy_offset);
        });
    });
}

function trimString(str, len, str_omit_sign){ // shorten
    if(str.length <= len){
        return str;
    }
    var trimmed = str.substring(0, len-str_omit_sign.length)+str_omit_sign;
    return trimmed;
}