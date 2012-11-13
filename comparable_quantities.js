_.templateSettings = {
    interpolate: /\{\{(.+?)\}\}/g,
    evaluate: /\{\%(.+?)\%\}/g
};
var templateFunction = null;

var getTemplateText = function(cb) {
    // gets the template of the popup to be rendered
    var url = chrome.extension.getURL('template.html');
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.onreadystatechange = function() {
        if (req.readyState == 4 && req.status == 200) {
            cb(req.responseText);
        }
    };
    req.send(null);
};

var compileTemplate = function(templateText) {
    // returns a template function that takes an object of params
    return _.template(templateText);
};

var getWolframAlphaResponse = function(input, successCallBack, errorCallBack) {
    // passes parsed xml as argument to success cb when request finishes
    var escapedInput = encodeURI(input);
    var appid = ''; // fill in your wolfram alpha id
    var url = 'http://api.wolframalpha.com/v2/query?appid='+ appid +'&input='+ escapedInput +'&format=plaintext';
    $.ajax(url).success(successCallBack).error(errorCallBack);
};

var templateObjectFromResponse = function($xml) {
    // transforms the wolfram alpha xml response to an object that we can use
    // in rendering the popup template
    var templateObject = {
            cssClassPrefix: 'comparable-quantities',
            units: [],
            comparisons: []
        },
        $comparisons = $xml.find('pod[id^="Comparison"]'),
        $units = $xml.find('#UnitConversion'),
        fixEqualSigns = function(str) {
            return str.replace(/\~\~/g, '&ap;')
        };
    $units.find('subpod').each(function(i) {
        templateObject.units.push(fixEqualSigns($(this).text()));
    });
    $comparisons.find('subpod').each(function(i) {
        templateObject.comparisons.push(fixEqualSigns($(this).text()));
    });
    return templateObject;
};

var renderTemplateOnPage = function(templateFunction, templateObj) {
    // takes the template and the template parameters, renders it, and shoves
    // it in the correct place on the page.
    var renderedText = templateFunction(templateObj);
    $('body').append(renderedText);
    var coordinates = $('.comparable-quantities-button').position();
    $('.comparable-quantities').css({
        top: coordinates.top - 10 - $('.comparable-quantities').height(),
        left: coordinates.left + 10
    });
    $('.comparable-quantities-close').on('click', hidePopups)
    hideButton();
};
var everythingSuccessCallback = function(xml) {
    // put all the functions together and call them in order
    var $xml = $(xml);
    if ($xml.find('queryresult').attr('success') == 'false') {
        throw 'omg no no no'
    }
    var templateObject = templateObjectFromResponse($xml);
    renderTemplateOnPage(templateFunction, templateObject);
}
getTemplateText(function(templateText) {
    templateFunction = compileTemplate(templateText);
});

function getSelectionText() {
    // a function to return the *text* and not just html of currently
    // highlighted words
    var html = "";
    if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var container = document.createElement("div");
            for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }
            html = container.innerHTML;
        }
    } else if (typeof document.selection != "undefined") {
        if (document.selection.type == "Text") {
            html = document.selection.createRange().htmlText;
        }
    }
    return $('<div>'+ html +'</div>').text();
};

var showButtonNearSelection = function(selection) {
    var $span= $("<span/>");
    var range = selection.getRangeAt(0);
    var newRange = document.createRange();
    newRange.setStart(selection.focusNode, range.endOffset);
    newRange.insertNode($span[0]); // using 'range' here instead of newRange unselects or causes flicker on chrome/webkit

    var x = $span.offset().left;
    var y = $span.offset().top;
    $span.remove();
    var $button = $('.comparable-quantities-button');
    $button.css({
        left: x + 5,
        top: y - $button.height(),
        display: 'block'
    });
};

var hideButton = function() {
    $('.comparable-quantities-button').hide();
};

var hidePopups = function() {
    $('.comparable-quantities').remove();
};

var handleSelection = function(evt) {
    if (false) {
        // if click/keypress is in popup, do nothing
        return;
    } else {
        // TODO: if not in popup or keypress is 'esc', close popup
        $('.comparable-quantities').remove();
    }

    var selection = window.getSelection();
    if (selection.type === "Range") {
        // if this is actually a selection
        showButtonNearSelection(selection);
    } else {
        hideButton();
    }
};
$(window).on('mouseup', handleSelection);
$(window).on('keyup', handleSelection);

$('body').append($('<div class="comparable-quantities-button"><a href="#null"> </a></div>'));
$('.comparable-quantities-button a').on('click', function(evt) {
    evt.preventDefault();
    var text = getSelectionText();
    getWolframAlphaResponse(text, everythingSuccessCallback, alert);
});

// getWolframAlphaResponse('10m', everythingSuccessCallback)

// TODO: make sure template ajax call finishes then wolfram alpha
// TODO: make errors for ajax call and bad wolfram alpha response
// TODO: play with highlighting mechanisms (make sure to deal with dom changes)
// TODO: style things
// TODO: cache things
