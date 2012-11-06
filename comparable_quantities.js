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
    var appid = '';
    var url = 'http://api.wolframalpha.com/v2/query?appid='+ appid +'&input='+ escapedInput +'&format=plaintext';
    $.ajax(url).success(successCallBack).error(errorCallBack);
};

var templateObjectFromResponse = function(xml) {
    // transforms the wolfram alpha xml response to an object that we can use
    // in rendering the popup template
    var templateObject = {
            cssClassPrefix: 'comparable-quantities',
            units: [],
            comparisons: []
        },
        $xml = $(xml),
        $comparisons = $xml.find('pod[id^="Comparison"]'),
        $units = $xml.find('#UnitConversion'),
        fixEqualSigns = function(str) {
            return str.replace(/\~\~/g, '&ap;')
        };
    $units.each(function(i) {
        templateObject.units.push(fixEqualSigns($(this).text()));
    });
    $comparisons.each(function(i) {
        templateObject.comparisons.push(fixEqualSigns($(this).text()));
    });
    return templateObject;
};

var renderTemplateOnPage = function(templateFunction, templateObj) {
    var renderedText = templateFunction(templateObj);
    $('body').append(renderedText);
};
var everythingSuccessCallback = function(xml) {
    var templateObject = templateObjectFromResponse(xml);
    renderTemplateOnPage(templateFunction, templateObject);
}
getTemplateText(function(templateText) {
    templateFunction = compileTemplate(templateText);
});

// getWolframAlphaResponse('10m', everythingSuccessCallback)

// TODO: make sure template ajax call finishes then wolfram alpha
// TODO: make errors for ajax call and bad wolfram alpha response
// TODO: make highlighting quantity mechanism
